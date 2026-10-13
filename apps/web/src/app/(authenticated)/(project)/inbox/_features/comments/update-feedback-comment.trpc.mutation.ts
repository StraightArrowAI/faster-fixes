"use server";

import { protectedProcedure } from "@/server/trpc/trpc";
import { inferProcedureOutput, TRPCError } from "@trpc/server";
import { canEditComment } from "./comment-permissions";
import { UpdateFeedbackCommentSchema } from "./feedback-comment.schema";
import { requireFeedbackMember } from "./require-feedback-member";

export const updateFeedbackComment = protectedProcedure
  .input(UpdateFeedbackCommentSchema)
  .mutation(async ({ input, ctx }) => {
    const { prisma, session } = ctx;

    const comment = await prisma.feedbackComment.findUnique({
      where: { id: input.commentId },
      select: { id: true, feedbackId: true, authorId: true, body: true },
    });

    if (!comment) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Comment not found." });
    }

    const member = await requireFeedbackMember(
      prisma,
      comment.feedbackId,
      session.user.id,
    );

    if (!canEditComment(comment, member)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only the author can edit this comment.",
      });
    }

    // An unchanged save is not an edit; don't mark it "edited".
    if (comment.body === input.body) return { id: comment.id };

    await prisma.feedbackComment.update({
      where: { id: comment.id },
      data: { body: input.body, editedAt: new Date() },
    });

    return { id: comment.id };
  });

export type UpdateFeedbackCommentOutput = inferProcedureOutput<
  typeof updateFeedbackComment
>;
