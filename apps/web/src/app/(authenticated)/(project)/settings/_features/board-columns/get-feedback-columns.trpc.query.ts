"use server";

import { protectedProcedure } from "@/server/trpc/trpc";
import type { FeedbackColumnCategory } from "@/types/feedback-status";
import { inferProcedureOutput } from "@trpc/server";
import z from "zod";
import { requireProjectMember } from "./require-project-member";

export const getFeedbackColumns = protectedProcedure
  .input(z.object({ projectId: z.string() }))
  .query(async ({ input, ctx }) => {
    const { prisma, session } = ctx;
    await requireProjectMember(prisma, input.projectId, session.user.id, {
      admin: false,
    });

    const columns = await prisma.feedbackColumn.findMany({
      where: { projectId: input.projectId },
      orderBy: { position: "asc" },
      select: { id: true, name: true, category: true, position: true },
    });

    return columns.map((c) => ({
      ...c,
      category: c.category as FeedbackColumnCategory,
    }));
  });

export type GetFeedbackColumnsOutput = inferProcedureOutput<
  typeof getFeedbackColumns
>;
