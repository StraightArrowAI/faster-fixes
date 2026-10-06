"use server";

import { inngest } from "@/server/inngest";
import { protectedProcedure } from "@/server/trpc/trpc";
import { TRPCError, type inferProcedureOutput } from "@trpc/server";
import { UpdateFeedbacksColumnSchema } from "./update-feedbacks-column.schema";

// The board's write path: a column carries its category, so moving a card sets
// both columnId and status in one write (ADR-0010). Single drags and bulk moves
// share this procedure.
export const updateFeedbacksColumn = protectedProcedure
  .input(UpdateFeedbacksColumnSchema)
  .mutation(async ({ input, ctx }) => {
    const { prisma, session } = ctx;

    const column = await prisma.feedbackColumn.findUnique({
      where: { id: input.columnId },
      include: { project: { select: { organizationId: true } } },
    });

    if (!column) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Column not found." });
    }

    const membership = await prisma.member.findFirst({
      where: {
        organizationId: column.project.organizationId,
        userId: session.user.id,
      },
    });

    if (!membership) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Access denied." });
    }

    // Scoping by projectId keeps a forged id from pulling another project's
    // feedback onto this board.
    const scope = {
      id: { in: input.feedbackIds },
      projectId: column.projectId,
    };
    const previous = await prisma.feedback.findMany({
      where: scope,
      select: { id: true, status: true },
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
        data: {
          feedbackId: f.id,
          newStatus: column.category,
          actor: "user" as const,
        },
      }));
    if (events.length > 0) inngest.send(events).catch(() => {});

    return { count: previous.length };
  });

export type UpdateFeedbacksColumnOutput = inferProcedureOutput<
  typeof updateFeedbacksColumn
>;
