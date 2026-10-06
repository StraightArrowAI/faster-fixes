import type {
  Prisma,
  PrismaClient,
} from "@workspace/db/generated/prisma/client";

type FeedbackWriter = Pick<PrismaClient | Prisma.TransactionClient, "feedback">;

// Every status write outside the board goes through here (ADR-0010). A column's
// category always equals its feedback's status, so only an actual status change
// invalidates the column; re-asserting the current status (a tracker echo, an
// agent looping a queue) must leave a card in a same-category lane like "In Test".
// Returns a PrismaPromise so callers can still batch it in $transaction([...]).
export function updateFeedbackStatuses(
  db: FeedbackWriter,
  where: Prisma.FeedbackWhereInput,
  status: string,
) {
  return db.feedback.updateMany({
    where: { AND: [where, { status: { not: status } }] },
    data: { status, columnId: null },
  });
}
