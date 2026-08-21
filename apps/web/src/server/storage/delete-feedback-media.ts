import { prisma } from "@workspace/db";
import { deleteAsset } from "./delete-asset";

type FeedbackWhere = NonNullable<
  NonNullable<Parameters<typeof prisma.feedback.findMany>[0]>["where"]
>;

/**
 * Every Asset FK a Feedback owns. Adding a new medium means adding it HERE and
 * nowhere else — the whole point of this helper is that a delete path cannot
 * know about one medium and silently forget another. That is exactly how
 * screenshots came to be orphaned on four paths, and how recordings would have
 * been orphaned again the moment they shipped.
 */
const MEDIA_ASSET_FIELDS = ["screenshotId", "recordingId"] as const;

// Storage deletes are issued in batches so that removing a large project or
// organization does not fire thousands of concurrent requests at the storage
// endpoint (and thousands of concurrent queries at the database).
const BATCH_SIZE = 20;

/**
 * Deletes the media Assets — stored object and DB row — belonging to every
 * Feedback matching `where`. Covers the screenshot and the screen recording;
 * see MEDIA_ASSET_FIELDS.
 *
 * Call this BEFORE deleting the feedback rows, and before deleting any row that
 * cascades to them (Project, Reviewer, Organization). The media relations are
 * `onDelete: SetNull`, which protects the *Feedback* when an Asset is removed;
 * it does nothing in the direction that matters here. Once a feedback row is
 * gone its FKs go with it, and the Assets plus their stored objects are
 * unreachable through the product forever: no report references them and no job
 * sweeps for them. That is a data-retention problem as much as a storage one —
 * this media contains the customer's production data, and a recording contains
 * far more of it than a still frame does.
 *
 * Best-effort per asset. `deleteAsset` already swallows storage failures (it
 * logs, then still deletes the row), and this helper additionally isolates each
 * asset so that one failure cannot abort the surrounding delete.
 */
export async function deleteFeedbackMedia(where: FeedbackWhere) {
  const rows = await prisma.feedback.findMany({
    // AND-wrapped rather than spread: a caller's `where` may itself carry an
    // OR, and spreading would silently overwrite it with this one.
    where: {
      AND: [
        where,
        { OR: MEDIA_ASSET_FIELDS.map((field) => ({ [field]: { not: null } })) },
      ],
    },
    select: { screenshotId: true, recordingId: true },
  });

  const assetIds = rows
    .flatMap((row) => MEDIA_ASSET_FIELDS.map((field) => row[field]))
    .filter((id): id is string => id !== null);

  for (let i = 0; i < assetIds.length; i += BATCH_SIZE) {
    const batch = assetIds.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((id) => deleteAsset(id)),
    );

    results.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(
          `Failed to delete feedback media asset (id=${batch[index]}):`,
          result.reason,
        );
      }
    });
  }
}
