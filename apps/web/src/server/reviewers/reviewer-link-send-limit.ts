export const REVIEWER_LINK_SEND_LIMIT = 20;
export const REVIEWER_LINK_SEND_WINDOW_MS = 60 * 60 * 1000;

export const REVIEWER_LINK_SEND_LIMIT_MESSAGE =
  "Link email limit reached for this project. Try again later.";

// Rolling window rather than a fixed hour so a burst at :59 cannot be followed
// by another full quota at :00.
export function getReviewerLinkSendWindowStart(now: Date): Date {
  return new Date(now.getTime() - REVIEWER_LINK_SEND_WINDOW_MS);
}

// Counts send events (distinct sendId), not rows: one email to three domains
// is one send.
export function isReviewerLinkSendLimitReached(sendCount: number): boolean {
  return sendCount >= REVIEWER_LINK_SEND_LIMIT;
}
