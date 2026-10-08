import type { FeedbackTagsInput } from "./feedback-tags.schema";

// Host-derived tags come from the browser-set Origin and so outrank what the
// page's script passed in the widget `tags` prop (ADR-0012, ADR-0013).
export function mergeFeedbackTags(
  appTags: FeedbackTagsInput | undefined,
  hostTags: FeedbackTagsInput,
): FeedbackTagsInput {
  return { ...appTags, ...hostTags };
}
