import z from "zod";

export const MAX_COMMENT_LENGTH = 5000;
const MAX_COLUMN_NAME_LENGTH = 100;
// Matches the largest selection a board realistically produces; keeps one
// createMany well under Postgres's bind-parameter limit.
const MAX_BULK_FEEDBACK = 200;

export const FeedbackCommentBodySchema = z
  .string()
  .trim()
  .min(1, "Write a comment.")
  .max(
    MAX_COMMENT_LENGTH,
    `Keep comments under ${MAX_COMMENT_LENGTH} characters.`,
  );

// Column names are sent by the client and frozen as written; they label the
// history and are never used to look a column up.
export const CommentTransitionSchema = z.object({
  from: z.string().trim().min(1).max(MAX_COLUMN_NAME_LENGTH).nullable(),
  to: z.string().trim().min(1).max(MAX_COLUMN_NAME_LENGTH),
});

export const GetFeedbackCommentsSchema = z.object({
  feedbackId: z.string(),
});

export const CreateFeedbackCommentSchema = z.object({
  feedbackId: z.string(),
  body: FeedbackCommentBodySchema,
  transition: CommentTransitionSchema.optional(),
});

export const BulkCreateFeedbackCommentsSchema = z.object({
  feedbackIds: z.array(z.string()).min(1).max(MAX_BULK_FEEDBACK),
  body: FeedbackCommentBodySchema,
  transition: CommentTransitionSchema.optional(),
});

export const UpdateFeedbackCommentSchema = z.object({
  commentId: z.string(),
  body: FeedbackCommentBodySchema,
});

export const DeleteFeedbackCommentSchema = z.object({
  commentId: z.string(),
});

export type CommentTransitionInput = z.infer<typeof CommentTransitionSchema>;
export type CreateFeedbackCommentInput = z.infer<
  typeof CreateFeedbackCommentSchema
>;
export type BulkCreateFeedbackCommentsInput = z.infer<
  typeof BulkCreateFeedbackCommentsSchema
>;

export const CommentBodyFormSchema = z.object({
  body: FeedbackCommentBodySchema,
});

export type CommentBodyFormInput = z.infer<typeof CommentBodyFormSchema>;
