import { prisma } from "@workspace/db";
import { deleteAsset } from "./delete-asset";

type FeedbackWhere = NonNullable<
  NonNullable<Parameters<typeof prisma.feedback.findMany>[0]>["where"]
>;

// Storage deletes are issued in batches so that removing a large project or
// organization does not fire thousands of concurrent requests at the storage
// endpoint (and thousands of concurrent queries at the database).
const BATCH_SIZE = 20;

/**
 * Deletes the screenshot Assets — stored object and DB row — belonging to every
 * Feedback matching `where`.
 *
 * Call this BEFORE deleting the feedback rows, and before deleting any row that
 * cascades to them (Project, Reviewer, Organization). `Feedback.screenshot` is
 * `onDelete: SetNull`, which protects the *Feedback* when the Asset is removed;
 * it does nothing in the direction that matters here. Once a feedback row is
 * gone its `screenshotId` goes with it, and the Asset plus its stored object are
 * unreachable through the product forever: no report references them and no job
 * sweeps for them. That is a data-retention problem as much as a storage one —
 * these images contain the customer's production data.
 *
 * Best-effort per asset. `deleteAsset` already swallows storage failures (it
 * logs, then still deletes the row), and this helper additionally isolates each
 * asset so that one failure cannot abort the surrounding delete.
 */
export async function deleteFeedbackScreenshots(where: FeedbackWhere) {
  const rows = await prisma.feedback.findMany({
    where: { ...where, screenshotId: { not: null } },
    select: { screenshotId: true },
  });

  const assetIds = rows
    .map((row) => row.screenshotId)
    .filter((id): id is string => id !== null);

  for (let i = 0; i < assetIds.length; i += BATCH_SIZE) {
    const batch = assetIds.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((id) => deleteAsset(id)),
    );

    results.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(
          `Failed to delete feedback screenshot asset (id=${batch[index]}):`,
          result.reason,
        );
      }
    });
  }
}
