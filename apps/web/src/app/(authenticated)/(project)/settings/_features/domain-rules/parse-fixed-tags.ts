import {
  FeedbackTagsSchema,
  type FeedbackTagsInput,
} from "@/server/domain-rules/feedback-tags.schema";

/** Parses the stored JSON column, falling back to no tags if it no longer validates. */
export function parseFixedTags(value: unknown): FeedbackTagsInput {
  const result = FeedbackTagsSchema.safeParse(value);
  return result.success ? result.data : {};
}
