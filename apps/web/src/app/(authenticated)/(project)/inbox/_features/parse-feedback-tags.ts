import {
  type FeedbackTagsInput,
  FeedbackTagsSchema,
} from "@/server/domain-rules/feedback-tags.schema";

/** Tags are validated on write, but one stale row must not break the board. */
export function parseFeedbackTags(value: unknown): FeedbackTagsInput {
  const result = FeedbackTagsSchema.safeParse(value);
  return result.success ? result.data : {};
}
