import { describe, expect, it } from "vitest";

import {
  getReviewerLinkSendWindowStart,
  isReviewerLinkSendLimitReached,
  REVIEWER_LINK_SEND_LIMIT,
} from "./reviewer-link-send-limit";

describe("getReviewerLinkSendWindowStart", () => {
  it("starts the window one hour before now", () => {
    const now = new Date("2026-10-08T12:30:00.000Z");
    expect(getReviewerLinkSendWindowStart(now).toISOString()).toBe(
      "2026-10-08T11:30:00.000Z",
    );
  });

  it("rolls across midnight", () => {
    const now = new Date("2026-10-09T00:15:00.000Z");
    expect(getReviewerLinkSendWindowStart(now).toISOString()).toBe(
      "2026-10-08T23:15:00.000Z",
    );
  });
});

describe("isReviewerLinkSendLimitReached", () => {
  it("allows sends below the limit", () => {
    expect(isReviewerLinkSendLimitReached(0)).toBe(false);
    expect(isReviewerLinkSendLimitReached(REVIEWER_LINK_SEND_LIMIT - 1)).toBe(
      false,
    );
  });

  it("blocks once the limit is reached", () => {
    expect(isReviewerLinkSendLimitReached(REVIEWER_LINK_SEND_LIMIT)).toBe(true);
    expect(isReviewerLinkSendLimitReached(REVIEWER_LINK_SEND_LIMIT + 5)).toBe(
      true,
    );
  });
});
