"use server";

import { protectedProcedure } from "@/server/trpc/trpc";
import { TRPCError, inferProcedureOutput } from "@trpc/server";
import { DeleteFeedbackColumnSchema } from "./delete-feedback-column.schema";
import { getFeedbackColumnById } from "./get-feedback-column-by-id";
import { requireProjectMember } from "./require-project-member";

export const deleteFeedbackColumn = protectedProcedure
  .input(DeleteFeedbackColumnSchema)
  .mutation(async ({ input, ctx }) => {
    const { prisma, session } = ctx;
    const column = await getFeedbackColumnById(prisma, input.columnId);
    await requireProjectMember(prisma, column.projectId, session.user.id, {
      admin: true,
    });

    const siblings = await prisma.feedbackColumn.count({
      where: { projectId: column.projectId, category: column.category },
    });

    // Null columnId resolves to the first column of the status's category, so
    // each category needs one column for its cards to land in.
    if (siblings <= 1) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Each status group needs at least one column.",
      });
    }

    // Cards keep their status; the FK's SetNull drops them into the first
    // remaining column of the same category. No status change, so no sync.
    await prisma.$transaction([
      prisma.feedbackColumn.delete({ where: { id: column.id } }),
      prisma.feedbackColumn.updateMany({
        where: {
          projectId: column.projectId,
          position: { gt: column.position },
        },
        data: { position: { decrement: 1 } },
      }),
    ]);

    return { id: column.id };
  });

export type DeleteFeedbackColumnOutput = inferProcedureOutput<
  typeof deleteFeedbackColumn
>;
