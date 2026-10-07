import type { FeedbackTags } from "./feedback-tags.schema";

// Rule tags come from the browser-set Origin and so outrank whatever the page's
// script passed in the widget `tags` prop (ADR-0012).
export function mergeFeedbackTags(
  appTags: FeedbackTags | undefined,
  ruleTags: FeedbackTags,
): FeedbackTags {
  return { ...appTags, ...ruleTags };
}
