"use server";

import { protectedProcedure } from "@/server/trpc/trpc";
import { inferProcedureOutput, TRPCError } from "@trpc/server";
import { BulkCreateFeedbackCommentsSchema } from "./feedback-comment.schema";

// One comment copied onto every card of a bulk move. Ids must all belong to a
// single Project so one membership check covers the whole batch.
export const bulkCreateFeedbackComments = protectedProcedure
  .input(BulkCreateFeedbackCommentsSchema)
  .mutation(async ({ input, ctx }) => {
    const { prisma, session } = ctx;
    const feedbackIds = [...new Set(input.feedbackIds)];

    const feedback = await prisma.feedback.findMany({
      where: { id: { in: feedbackIds } },
      select: {
        id: true,
        projectId: true,
        project: { select: { organizationId: true } },
      },
    });

    if (feedback.length !== feedbackIds.length) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Feedback not found.",
      });
    }

    const projectIds = new Set(feedback.map((f) => f.projectId));
    if (projectIds.size !== 1) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Feedback must belong to one project.",
      });
    }

    const member = await prisma.member.findFirst({
      where: {
        organizationId: feedback[0]!.project.organizationId,
        userId: session.user.id,
      },
      select: { id: true },
    });

    if (!member) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Access denied." });
    }

    const { count } = await prisma.feedbackComment.createMany({
      data: feedbackIds.map((feedbackId) => ({
        feedbackId,
        authorId: member.id,
        body: input.body,
        fromColumnName: input.transition?.from ?? null,
        toColumnName: input.transition?.to ?? null,
      })),
    });

    return { count };
  });

export type BulkCreateFeedbackCommentsOutput = inferProcedureOutput<
  typeof bulkCreateFeedbackComments
>;
