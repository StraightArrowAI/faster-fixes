import { describe, expect, it } from "vitest";

import {
  buildReviewerShareUrl,
  parseReviewerLinkUrl,
} from "./reviewer-share-url";

describe("parseReviewerLinkUrl", () => {
  it.each([
    [
      "https://acme.rms.dev.straightarrow.ai",
      "https://acme.rms.dev.straightarrow.ai/",
      "acme.rms.dev.straightarrow.ai",
    ],
    [
      "acme.rms.dev.straightarrow.ai/orders?id=4",
      "https://acme.rms.dev.straightarrow.ai/orders?id=4",
      "acme.rms.dev.straightarrow.ai",
    ],
    [
      "  HTTPS://RMS.Dev.StraightArrow.ai./x  ",
      "https://rms.dev.straightarrow.ai./x",
      "rms.dev.straightarrow.ai",
    ],
    [
      "http://localhost:3000/checkout",
      "http://localhost:3000/checkout",
      "localhost",
    ],
    ["https://a.com/?ff_token=old&x=1", "https://a.com/?x=1", "a.com"],
  ])("accepts %s", (raw, url, host) => {
    expect(parseReviewerLinkUrl(raw)).toEqual({ ok: true, url, host });
  });

  it.each([
    "",
    "   ",
    "ftp://a.com",
    "javascript:alert(1)",
    "https://",
    "not a url at all",
  ])("rejects %j", (raw) => {
    expect(parseReviewerLinkUrl(raw).ok).toBe(false);
  });
});

describe("buildReviewerShareUrl", () => {
  it("uses the stored link", () => {
    expect(
      buildReviewerShareUrl(
        "https://acme.rms.dev.straightarrow.ai/orders?id=4",
        "straightarrow.ai",
        "t0k",
      ),
    ).toBe("https://acme.rms.dev.straightarrow.ai/orders?id=4&ff_token=t0k");
  });

  it("falls back to the main domain", () => {
    expect(buildReviewerShareUrl(null, "straightarrow.ai", "t0k")).toBe(
      "https://straightarrow.ai/?ff_token=t0k",
    );
  });

  it("falls back when a stored link no longer parses", () => {
    expect(buildReviewerShareUrl("::bad::", "straightarrow.ai", "t0k")).toBe(
      "https://straightarrow.ai/?ff_token=t0k",
    );
  });
});
