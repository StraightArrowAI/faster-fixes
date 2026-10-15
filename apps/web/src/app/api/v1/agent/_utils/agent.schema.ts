import { FeedbackCommentBodySchema } from "@/app/(authenticated)/(project)/inbox/_features/comments/feedback-comment.schema";
import { FeedbackStatusEnum } from "@/types/feedback-status";
import { z } from "zod";

export { FeedbackStatusEnum };

export const ListFeedbacksQuerySchema = z.object({
  status: FeedbackStatusEnum.optional(),
  page_url: z.url().optional(),
  project: z.string().min(1),
  format: z.enum(["json", "markdown"]).default("json"),
  // "none" matches Feedback without an env tag.
  env: z.string().trim().min(1).max(64).optional(),
  // Column id or name (case-insensitive).
  column: z.string().trim().min(1).max(100).optional(),
});

export const ListColumnsQuerySchema = z.object({
  project: z.string().min(1),
});

export const UpdateFeedbackStatusSchema = z.object({
  status: FeedbackStatusEnum,
  comment: FeedbackCommentBodySchema.optional(),
});

export const MoveFeedbackColumnSchema = z.object({
  column: z.string().trim().min(1).max(100),
  comment: FeedbackCommentBodySchema.optional(),
});

export const CreateAgentCommentSchema = z.object({
  body: FeedbackCommentBodySchema,
});

export const FeedbackIdSchema = z.string().uuid();

const FeedbackItemSchema = z.object({
  comment: z.string().trim().min(1),
  pageUrl: z.url(),
  status: FeedbackStatusEnum.optional(),
  selector: z.string().optional(),
  clickX: z.number().optional(),
  clickY: z.number().optional(),
  browserName: z.string().optional(),
  browserVersion: z.string().optional(),
  os: z.string().optional(),
  viewportWidth: z.number().int().optional(),
  viewportHeight: z.number().int().optional(),
  // Preserve original timestamp from the source tool — useful for migrations.
  createdAt: z.iso.datetime().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const CreateFeedbacksSchema = z.object({
  project: z.string().min(1),
  reviewer_name: z.string().trim().min(1).max(100).optional(),
  // Free-form tag (e.g. "bugherd", "marker.io") stamped into each feedback's
  // metadata so migrated items remain traceable to their origin tool.
  source: z.string().trim().min(1).max(50).optional(),
  feedbacks: z.array(FeedbackItemSchema).min(1).max(100),
});

export type ListFeedbacksQueryInput = z.infer<typeof ListFeedbacksQuerySchema>;
export type UpdateFeedbackStatusInput = z.infer<
  typeof UpdateFeedbackStatusSchema
>;
export type MoveFeedbackColumnInput = z.infer<typeof MoveFeedbackColumnSchema>;
export type CreateAgentCommentInput = z.infer<typeof CreateAgentCommentSchema>;
