"use server";

import { protectedProcedure } from "@/server/trpc/trpc";
import { inferProcedureOutput } from "@trpc/server";
import { assertUniqueColumnName } from "./assert-unique-column-name";
import { getFeedbackColumnById } from "./get-feedback-column-by-id";
import { requireProjectMember } from "./require-project-member";
import { UpdateFeedbackColumnSchema } from "./update-feedback-column.schema";

// Rename only. Category is immutable: changing it would silently re-status
// every card in the column and fan out tracker syncs (ADR-0010).
export const updateFeedbackColumn = protectedProcedure
  .input(UpdateFeedbackColumnSchema)
  .mutation(async ({ input, ctx }) => {
    const { prisma, session } = ctx;
    const column = await getFeedbackColumnById(prisma, input.columnId);
    await requireProjectMember(prisma, column.projectId, session.user.id, {
      admin: true,
    });
    await assertUniqueColumnName(
      prisma,
      column.projectId,
      input.name,
      column.id,
    );

    await prisma.feedbackColumn.update({
      where: { id: column.id },
      data: { name: input.name },
    });

    return { id: column.id };
  });

export type UpdateFeedbackColumnOutput = inferProcedureOutput<
  typeof updateFeedbackColumn
>;
