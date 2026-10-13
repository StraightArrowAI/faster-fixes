"use server";

import { protectedProcedure } from "@/server/trpc/trpc";
import { inferProcedureOutput, TRPCError } from "@trpc/server";
import { canDeleteComment } from "./comment-permissions";
import { DeleteFeedbackCommentSchema } from "./feedback-comment.schema";
import { requireFeedbackMember } from "./require-feedback-member";

export const deleteFeedbackComment = protectedProcedure
  .input(DeleteFeedbackCommentSchema)
  .mutation(async ({ input, ctx }) => {
    const { prisma, session } = ctx;

    const comment = await prisma.feedbackComment.findUnique({
      where: { id: input.commentId },
      select: { id: true, feedbackId: true, authorId: true },
    });

    if (!comment) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Comment not found." });
    }

    const member = await requireFeedbackMember(
      prisma,
      comment.feedbackId,
      session.user.id,
    );

    if (!canDeleteComment(comment, member)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only the author, owners and admins can delete this comment.",
      });
    }

    await prisma.feedbackComment.delete({ where: { id: comment.id } });

    return { id: comment.id };
  });

export type DeleteFeedbackCommentOutput = inferProcedureOutput<
  typeof deleteFeedbackComment
>;
