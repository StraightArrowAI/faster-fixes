import { describe, expect, it } from "vitest";

import { parseProjectDomainUrl } from "./project-domain-url";

describe("parseProjectDomainUrl", () => {
  it.each([
    [
      "rms.dev.straightarrow.ai",
      "https://rms.dev.straightarrow.ai",
      "rms.dev.straightarrow.ai",
    ],
    [
      "HTTPS://RMS.Dev.StraightArrow.ai./app/",
      "https://rms.dev.straightarrow.ai/app",
      "rms.dev.straightarrow.ai",
    ],
    ["https://a.com/orders?id=4#top", "https://a.com/orders", "a.com"],
    [
      "http://staging.acme.com:8080/x",
      "http://staging.acme.com:8080/x",
      "staging.acme.com",
    ],
  ])("accepts %s", (raw, url, host) => {
    expect(parseProjectDomainUrl(raw)).toEqual({ ok: true, url, host });
  });

  it.each([
    "",
    "ftp://a.com",
    "javascript:alert(1)",
    "https://",
    "localhost",
    "https://10.0.0.1",
    "not a url",
  ])("rejects %j", (raw) => {
    expect(parseProjectDomainUrl(raw).ok).toBe(false);
  });
});
