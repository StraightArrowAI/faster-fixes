import { inngest } from "@/server/inngest";
import type { PrismaClient } from "@workspace/db/generated/prisma/client";

type MoveFeedbacksInput = {
  feedbackIds: string[];
  column: { id: string; projectId: string; category: string };
  actor: "user" | "agent";
};

// The only column-move write path, shared by the board and the agent API so
// they cannot drift (ADR-0010): a column carries its category, so a move sets
// columnId and status together. Returns each moved card's previous state so
// callers can record where it came from.
export async function moveFeedbacksToColumn(
  prisma: PrismaClient,
  { feedbackIds, column, actor }: MoveFeedbacksInput,
) {
  // Scoping by projectId keeps a forged id from pulling another project's
  // feedback onto this board.
  const scope = { id: { in: feedbackIds }, projectId: column.projectId };
  const previous = await prisma.feedback.findMany({
    where: scope,
    select: { id: true, status: true, columnId: true },
  });

  await prisma.feedback.updateMany({
    where: scope,
    data: { columnId: column.id, status: column.category },
  });

  // Same-category moves (In Progress → In Test) are invisible to trackers
  // and notifications by design; only real status changes fan out.
  const events = previous
    .filter((f) => f.status !== column.category)
    .map((f) => ({
      name: "feedback/status-changed" as const,
      data: { feedbackId: f.id, newStatus: column.category, actor },
    }));
  if (events.length > 0) inngest.send(events).catch(() => {});

  return previous;
}
