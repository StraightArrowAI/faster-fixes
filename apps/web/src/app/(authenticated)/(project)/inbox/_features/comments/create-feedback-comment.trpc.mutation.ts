"use server";

import { protectedProcedure } from "@/server/trpc/trpc";
import { inferProcedureOutput } from "@trpc/server";
import { CreateFeedbackCommentSchema } from "./feedback-comment.schema";
import { requireFeedbackMember } from "./require-feedback-member";

export const createFeedbackComment = protectedProcedure
  .input(CreateFeedbackCommentSchema)
  .mutation(async ({ input, ctx }) => {
    const { prisma, session } = ctx;
    const member = await requireFeedbackMember(
      prisma,
      input.feedbackId,
      session.user.id,
    );

    const comment = await prisma.feedbackComment.create({
      data: {
        feedbackId: input.feedbackId,
        authorId: member.id,
        body: input.body,
        fromColumnName: input.transition?.from ?? null,
        toColumnName: input.transition?.to ?? null,
      },
      select: { id: true },
    });

    return comment;
  });

export type CreateFeedbackCommentOutput = inferProcedureOutput<
  typeof createFeedbackComment
>;
