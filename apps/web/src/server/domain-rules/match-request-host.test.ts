import { describe, expect, it } from "vitest";

import {
  type DomainRuleInput,
  getRequestHost,
  matchRequestHost,
} from "./match-request-host";

const rules: DomainRuleInput[] = [
  { pattern: "{account}.rms.{env}.straightarrow.ai", fixedTags: {} },
  { pattern: "rms.{env}.straightarrow.ai", fixedTags: {} },
  { pattern: "straightarrow-rms-*.vercel.app", fixedTags: { env: "preview" } },
  { pattern: "localhost", fixedTags: { env: "local" } },
];

describe("getRequestHost", () => {
  it("reads Origin, lowercases, drops port and trailing dot", () => {
    const headers = new Headers({
      origin: "https://RMS.Dev.StraightArrow.ai.:8443",
    });
    expect(getRequestHost(headers)).toBe("rms.dev.straightarrow.ai");
  });

  it("falls back to Referer", () => {
    const headers = new Headers({ referer: "https://www.acme.com/page?x=1" });
    expect(getRequestHost(headers)).toBe("www.acme.com");
  });

  it("returns null without a usable header", () => {
    expect(getRequestHost(new Headers())).toBeNull();
    expect(getRequestHost(new Headers({ origin: "null" }))).toBeNull();
  });
});

describe("matchRequestHost", () => {
  it("uses the first matching rule", () => {
    expect(
      matchRequestHost(
        "acme.rms.dev.straightarrow.ai",
        rules,
        "straightarrow.ai",
      ),
    ).toEqual({
      allowed: true,
      ruleTags: { account: "acme", env: "dev" },
    });
    expect(
      matchRequestHost("rms.prod.straightarrow.ai", rules, "straightarrow.ai"),
    ).toEqual({
      allowed: true,
      ruleTags: { env: "prod" },
    });
  });

  it("respects rule order", () => {
    const ordered: DomainRuleInput[] = [
      {
        pattern: "rms.prod.straightarrow.ai",
        fixedTags: { env: "production" },
      },
      { pattern: "rms.{env}.straightarrow.ai", fixedTags: {} },
    ];
    expect(
      matchRequestHost("rms.prod.straightarrow.ai", ordered, "x.com"),
    ).toEqual({
      allowed: true,
      ruleTags: { env: "production" },
    });
  });

  it("lets captured tags override fixed tags", () => {
    const r = [
      {
        pattern: "rms.{env}.straightarrow.ai",
        fixedTags: { env: "x", team: "a" },
      },
    ];
    expect(matchRequestHost("rms.dev.straightarrow.ai", r, "x.com")).toEqual({
      allowed: true,
      ruleTags: { env: "dev", team: "a" },
    });
  });

  it("applies fixed tags for unrelated hosts", () => {
    expect(
      matchRequestHost(
        "straightarrow-rms-git-main.vercel.app",
        rules,
        "straightarrow.ai",
      ),
    ).toEqual({ allowed: true, ruleTags: { env: "preview" } });
  });

  it("tags localhost when a localhost rule exists", () => {
    expect(matchRequestHost("localhost", rules, "straightarrow.ai")).toEqual({
      allowed: true,
      ruleTags: { env: "local" },
    });
  });

  it("falls back to the main domain and its subdomains without tags", () => {
    expect(
      matchRequestHost("www.straightarrow.ai", rules, "straightarrow.ai"),
    ).toEqual({
      allowed: true,
      ruleTags: {},
    });
    expect(
      matchRequestHost("a.b.straightarrow.ai", [], "straightarrow.ai"),
    ).toEqual({
      allowed: true,
      ruleTags: {},
    });
  });

  it("always allows loopback hosts", () => {
    for (const host of ["localhost", "127.0.0.1", "::1"]) {
      expect(matchRequestHost(host, [], "acme.com")).toEqual({
        allowed: true,
        ruleTags: {},
      });
    }
  });

  it("rejects hosts that match nothing", () => {
    expect(
      matchRequestHost("other.vercel.app", rules, "straightarrow.ai"),
    ).toEqual({
      allowed: false,
    });
    expect(
      matchRequestHost("straightarrow.ai.evil.com", rules, "straightarrow.ai"),
    ).toEqual({
      allowed: false,
    });
  });

  it("skips invalid stored patterns instead of throwing", () => {
    expect(
      matchRequestHost(
        "acme.com",
        [{ pattern: "*.com", fixedTags: {} }],
        "x.com",
      ),
    ).toEqual({ allowed: false });
  });
});
