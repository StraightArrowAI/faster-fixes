import { describe, expect, it } from "vitest";

import {
  extractHostTags,
  getRequestHost,
  matchProjectDomain,
  type ProjectDomainInput,
  resolveHost,
  type TagExtractorInput,
} from "./match-request-host";

const domains: ProjectDomainInput[] = [
  {
    id: "primary",
    host: "straightarrow.ai",
    includeSubdomains: true,
    environment: "prod",
  },
  {
    id: "dev",
    host: "rms.dev.straightarrow.ai",
    includeSubdomains: true,
    environment: "dev",
  },
  {
    id: "exact",
    host: "rms.straightarrow.ai",
    includeSubdomains: false,
    environment: null,
  },
  {
    id: "preview",
    host: "straightarrow-rms.vercel.app",
    includeSubdomains: false,
    environment: "preview",
  },
];

const extractors: TagExtractorInput[] = [
  { pattern: "{account}.rms.{env}.straightarrow.ai", fixedTags: {} },
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
    expect(
      getRequestHost(new Headers({ referer: "https://www.acme.com/p?x=1" })),
    ).toBe("www.acme.com");
  });

  it("returns null without a usable header", () => {
    expect(getRequestHost(new Headers())).toBeNull();
    expect(getRequestHost(new Headers({ origin: "null" }))).toBeNull();
  });
});

describe("matchProjectDomain", () => {
  it("prefers an exact host over a subdomain match", () => {
    expect(matchProjectDomain("rms.dev.straightarrow.ai", domains)?.id).toBe(
      "dev",
    );
    expect(matchProjectDomain("rms.straightarrow.ai", domains)?.id).toBe(
      "exact",
    );
  });

  it("prefers the longest subdomain match", () => {
    expect(
      matchProjectDomain("acme.rms.dev.straightarrow.ai", domains)?.id,
    ).toBe("dev");
    expect(matchProjectDomain("app.straightarrow.ai", domains)?.id).toBe(
      "primary",
    );
  });

  it("does not extend exact-only entries to subdomains", () => {
    expect(
      matchProjectDomain("x.straightarrow-rms.vercel.app", domains),
    ).toBeNull();
  });

  it("rejects look-alikes", () => {
    expect(matchProjectDomain("evilstraightarrow.ai", domains)).toBeNull();
    expect(matchProjectDomain("straightarrow.ai.evil.com", domains)).toBeNull();
  });
});

describe("extractHostTags", () => {
  it("uses the first matching extractor, captures over fixed tags", () => {
    const ex: TagExtractorInput[] = [
      {
        pattern: "rms.{env}.straightarrow.ai",
        fixedTags: { env: "x", team: "a" },
      },
      { pattern: "rms.*.straightarrow.ai", fixedTags: { team: "b" } },
    ];
    expect(extractHostTags("rms.dev.straightarrow.ai", ex)).toEqual({
      env: "dev",
      team: "a",
    });
  });

  it("returns no tags without a match", () => {
    expect(extractHostTags("other.com", extractors)).toEqual({});
  });

  it("skips invalid stored patterns", () => {
    expect(
      extractHostTags("a.com", [{ pattern: "a..com", fixedTags: { x: "1" } }]),
    ).toEqual({});
  });
});

describe("resolveHost", () => {
  const project = { domains, extractors, fallbackDomain: "unused.com" };

  it("denies hosts no domain allows, even when an extractor matches", () => {
    const ex = [{ pattern: "*.evil.com", fixedTags: { env: "x" } }];
    expect(resolveHost("a.evil.com", { ...project, extractors: ex })).toEqual({
      allowed: false,
    });
  });

  it("tags with the domain's environment", () => {
    expect(resolveHost("straightarrow-rms.vercel.app", project)).toEqual({
      allowed: true,
      domainId: "preview",
      tags: { env: "preview" },
    });
  });

  it("lets extractor tags override the domain's environment", () => {
    const ex = [
      { pattern: "{account}.rms.{env}.straightarrow.ai", fixedTags: {} },
    ];
    // Matched by the primary (env=prod), but the extractor reads env=staging.
    expect(
      resolveHost("acme.rms.staging.straightarrow.ai", {
        ...project,
        extractors: ex,
      }),
    ).toEqual({
      allowed: true,
      domainId: "primary",
      tags: { env: "staging", account: "acme" },
    });
  });

  it("omits env when the domain has none", () => {
    expect(resolveHost("rms.straightarrow.ai", project)).toEqual({
      allowed: true,
      domainId: "exact",
      tags: {},
    });
  });

  it("always allows loopback and still runs extractors", () => {
    expect(resolveHost("localhost", project)).toEqual({
      allowed: true,
      domainId: null,
      tags: { env: "local" },
    });
    expect(resolveHost("::1", { ...project, extractors: [] })).toEqual({
      allowed: true,
      domainId: null,
      tags: {},
    });
  });

  it("falls back to the legacy main domain when a Project has no domain rows", () => {
    const legacy = { domains: [], extractors: [], fallbackDomain: "acme.com" };
    expect(resolveHost("www.acme.com", legacy)).toEqual({
      allowed: true,
      domainId: null,
      tags: {},
    });
    expect(resolveHost("acme.com.evil.com", legacy)).toEqual({
      allowed: false,
    });
  });
});
