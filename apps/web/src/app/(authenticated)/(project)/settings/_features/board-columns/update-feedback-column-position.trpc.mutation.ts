"use server";

import { protectedProcedure } from "@/server/trpc/trpc";
import { TRPCError, inferProcedureOutput } from "@trpc/server";
import { getFeedbackColumnById } from "./get-feedback-column-by-id";
import { requireProjectMember } from "./require-project-member";
import { UpdateFeedbackColumnPositionSchema } from "./update-feedback-column-position.schema";

export const updateFeedbackColumnPosition = protectedProcedure
  .input(UpdateFeedbackColumnPositionSchema)
  .mutation(async ({ input, ctx }) => {
    const { prisma, session } = ctx;
    const column = await getFeedbackColumnById(prisma, input.columnId);
    await requireProjectMember(prisma, column.projectId, session.user.id, {
      admin: true,
    });

    const neighbor = await prisma.feedbackColumn.findFirst({
      where: {
        projectId: column.projectId,
        position:
          input.direction === "up"
            ? { lt: column.position }
            : { gt: column.position },
      },
      orderBy: { position: input.direction === "up" ? "desc" : "asc" },
    });

    // Columns only reorder within their category so the board's left-to-right
    // flow always matches the status lifecycle.
    if (!neighbor || neighbor.category !== column.category) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "A column can only move within its status group.",
      });
    }

    await prisma.$transaction([
      prisma.feedbackColumn.update({
        where: { id: column.id },
        data: { position: neighbor.position },
      }),
      prisma.feedbackColumn.update({
        where: { id: neighbor.id },
        data: { position: column.position },
      }),
    ]);

    return { id: column.id };
  });

export type UpdateFeedbackColumnPositionOutput = inferProcedureOutput<
  typeof updateFeedbackColumnPosition
>;
