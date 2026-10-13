"use server";

import { protectedProcedure } from "@/server/trpc/trpc";
import { inferProcedureOutput } from "@trpc/server";
import { canDeleteComment, canEditComment } from "./comment-permissions";
import { GetFeedbackCommentsSchema } from "./feedback-comment.schema";
import { requireFeedbackMember } from "./require-feedback-member";

// Separate lazy query rather than part of feedback.list: threads are only
// needed for the one card open in the panel.
export const getFeedbackComments = protectedProcedure
  .input(GetFeedbackCommentsSchema)
  .query(async ({ input, ctx }) => {
    const { prisma, session } = ctx;
    const viewer = await requireFeedbackMember(
      prisma,
      input.feedbackId,
      session.user.id,
    );

    const comments = await prisma.feedbackComment.findMany({
      where: { feedbackId: input.feedbackId },
      orderBy: { createdAt: "asc" },
      include: {
        author: {
          select: {
            id: true,
            user: { select: { name: true, email: true, image: true } },
          },
        },
      },
    });

    return comments.map((c) => ({
      id: c.id,
      createdAt: c.createdAt,
      editedAt: c.editedAt,
      body: c.body,
      fromColumnName: c.fromColumnName,
      toColumnName: c.toColumnName,
      author: c.author
        ? {
            id: c.author.id,
            name: c.author.user.name || c.author.user.email,
            image: c.author.user.image,
          }
        : null,
      canEdit: canEditComment(c, viewer),
      canDelete: canDeleteComment(c, viewer),
    }));
  });

export type GetFeedbackCommentsOutput = inferProcedureOutput<
  typeof getFeedbackComments
>;
export type FeedbackCommentItem = GetFeedbackCommentsOutput[number];
