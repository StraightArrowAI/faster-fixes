"use server";

import { protectedProcedure } from "@/server/trpc/trpc";
import { inferProcedureOutput } from "@trpc/server";
import { assertUniqueColumnName } from "./assert-unique-column-name";
import { CreateFeedbackColumnSchema } from "./create-feedback-column.schema";
import { requireProjectMember } from "./require-project-member";

export const createFeedbackColumn = protectedProcedure
  .input(CreateFeedbackColumnSchema)
  .mutation(async ({ input, ctx }) => {
    const { prisma, session } = ctx;
    await requireProjectMember(prisma, input.projectId, session.user.id, {
      admin: true,
    });
    await assertUniqueColumnName(prisma, input.projectId, input.name);

    return prisma.$transaction(async (tx) => {
      // Append to the end of the category's group, not the board, so lanes
      // keep reading New → In Progress → Resolved left to right. Every project
      // has at least one column per category, so `last` always exists.
      const last = await tx.feedbackColumn.findFirstOrThrow({
        where: { projectId: input.projectId, category: input.category },
        orderBy: { position: "desc" },
        select: { position: true },
      });
      const position = last.position + 1;

      await tx.feedbackColumn.updateMany({
        where: { projectId: input.projectId, position: { gte: position } },
        data: { position: { increment: 1 } },
      });

      return tx.feedbackColumn.create({
        data: {
          projectId: input.projectId,
          name: input.name,
          category: input.category,
          position,
        },
        select: { id: true },
      });
    });
  });

export type CreateFeedbackColumnOutput = inferProcedureOutput<
  typeof createFeedbackColumn
>;
