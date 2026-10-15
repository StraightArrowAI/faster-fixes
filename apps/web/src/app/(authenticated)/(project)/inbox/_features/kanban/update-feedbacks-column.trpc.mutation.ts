"use server";

import { moveFeedbacksToColumn } from "@/server/feedback/move-feedbacks-to-column";
import { protectedProcedure } from "@/server/trpc/trpc";
import { TRPCError, type inferProcedureOutput } from "@trpc/server";
import { UpdateFeedbacksColumnSchema } from "./update-feedbacks-column.schema";

// The board's write path. Single drags and bulk moves share this procedure;
// the write itself lives in moveFeedbacksToColumn, shared with the agent API.
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

    const previous = await moveFeedbacksToColumn(prisma, {
      feedbackIds: input.feedbackIds,
      column,
      actor: "user",
    });

    return { count: previous.length };
  });

export type UpdateFeedbacksColumnOutput = inferProcedureOutput<
  typeof updateFeedbacksColumn
>;
