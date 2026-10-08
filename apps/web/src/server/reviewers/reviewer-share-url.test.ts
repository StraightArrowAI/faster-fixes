import { describe, expect, it } from "vitest";

import { buildReviewerShareUrl } from "./reviewer-share-url";

describe("buildReviewerShareUrl", () => {
  it("appends the token to the domain URL", () => {
    expect(
      buildReviewerShareUrl("https://rms.dev.straightarrow.ai", "t0k"),
    ).toBe("https://rms.dev.straightarrow.ai/?ff_token=t0k");
  });

  it("keeps the domain's path", () => {
    expect(buildReviewerShareUrl("https://a.com/app", "t0k")).toBe(
      "https://a.com/app?ff_token=t0k",
    );
  });
});
