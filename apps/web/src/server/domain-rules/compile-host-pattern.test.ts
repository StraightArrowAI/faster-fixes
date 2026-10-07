import { describe, expect, it } from "vitest";

import {
  compileHostPattern,
  matchCompiledPattern,
} from "./compile-host-pattern";
import { isOpenSharedHostPattern } from "./shared-hosting-suffixes";

function compileOk(pattern: string) {
  const result = compileHostPattern(pattern);
  if (!result.ok)
    throw new Error(`expected ${pattern} to compile: ${result.error}`);
  return result.pattern;
}

describe("compileHostPattern", () => {
  it.each([
    "rms.straightarrow.ai",
    "rms.{env}.straightarrow.ai",
    "{account}.rms.{env}.straightarrow.ai",
    "straightarrow-rms-*.vercel.app",
    "rms-{env}.vercel.app",
    "{branch}-{env}.vercel.app",
    "*.straightarrow.ai",
    "localhost",
    "{x}.vercel.app",
    "  RMS.{env}.StraightArrow.AI  ",
  ])("accepts %s", (pattern) => {
    expect(compileHostPattern(pattern).ok).toBe(true);
  });

  it.each([
    ["", "empty"],
    ["*.com", "last two labels"],
    ["rms.{x}.app", "last two labels"],
    ["rms.{env}", "last two labels"],
    ["straightarrow", "last two labels"],
    ["a..straightarrow.ai", "empty label"],
    ["{a}{b}.straightarrow.ai", "adjacent"],
    ["*{a}.straightarrow.ai", "adjacent"],
    ["{env}.{env}.straightarrow.ai", "more than once"],
    ["{e-nv}.straightarrow.ai", "placeholder name"],
    ["{1env}.straightarrow.ai", "placeholder name"],
    ["{env.straightarrow.ai", "unclosed"],
    ["rms_x.straightarrow.ai", "invalid character"],
    ["https://rms.straightarrow.ai", "invalid character"],
    ["rms.straightarrow.ai:3000", "invalid character"],
    [`${"a".repeat(250)}.straightarrow.ai`, "253"],
    ["a*b*c*d.straightarrow.ai", "at most two"],
    ["{a}-{b}-{c}.straightarrow.ai", "at most two"],
  ])("rejects %s (%s)", (pattern, message) => {
    const result = compileHostPattern(pattern);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain(message);
  });

  it("lowercases and trims", () => {
    expect(compileOk("  RMS.{env}.StraightArrow.AI ").source).toBe(
      "rms.{env}.straightarrow.ai",
    );
  });

  it("lists placeholder names in order", () => {
    expect(
      compileOk("{account}.rms.{env}.straightarrow.ai").placeholders,
    ).toEqual(["account", "env"]);
  });
});

describe("matchCompiledPattern", () => {
  it("captures whole-label placeholders", () => {
    const p = compileOk("{account}.rms.{env}.straightarrow.ai");
    expect(matchCompiledPattern(p, "acme.rms.dev.straightarrow.ai")).toEqual({
      account: "acme",
      env: "dev",
    });
  });

  it("requires the same label count", () => {
    const p = compileOk("rms.{env}.straightarrow.ai");
    expect(matchCompiledPattern(p, "acme.rms.dev.straightarrow.ai")).toBeNull();
    expect(matchCompiledPattern(p, "rms.straightarrow.ai")).toBeNull();
  });

  it("never lets a token cross a dot", () => {
    const p = compileOk("rms.{env}.straightarrow.ai");
    expect(matchCompiledPattern(p, "rms.dev.evil.straightarrow.ai")).toBeNull();
  });

  it("rejects look-alike hosts", () => {
    const p = compileOk("rms.{env}.straightarrow.ai");
    expect(
      matchCompiledPattern(p, "rms.dev.straightarrow.ai.evil.com"),
    ).toBeNull();
    expect(matchCompiledPattern(p, "rms.dev.evilstraightarrow.ai")).toBeNull();
  });

  it("matches partial-label wildcards", () => {
    const p = compileOk("straightarrow-rms-*.vercel.app");
    expect(
      matchCompiledPattern(p, "straightarrow-rms-git-feat-x.vercel.app"),
    ).toEqual({});
    expect(matchCompiledPattern(p, "other-rms-git.vercel.app")).toBeNull();
    expect(matchCompiledPattern(p, "straightarrow-rms-.vercel.app")).toBeNull();
  });

  it("captures greedily left to right within a label", () => {
    const p = compileOk("{a}-{b}.straightarrow.ai");
    expect(matchCompiledPattern(p, "x-y-z.straightarrow.ai")).toEqual({
      a: "x-y",
      b: "z",
    });
  });

  it("rejects hosts beyond DNS length limits without matching", () => {
    const p = compileOk("{a}-{b}.straightarrow.ai");
    expect(
      matchCompiledPattern(p, `${"a".repeat(64)}.straightarrow.ai`),
    ).toBeNull();
    expect(
      matchCompiledPattern(p, `${"a-".repeat(200)}.straightarrow.ai`),
    ).toBeNull();
  });

  it("stays fast on a hostile label at the length limit", () => {
    const p = compileOk("{a}-{b}.straightarrow.ai");
    const start = performance.now();
    matchCompiledPattern(p, `${"-".repeat(62)}x.straightarrow.ai`);
    expect(performance.now() - start).toBeLessThan(50);
  });

  it("matches literal localhost", () => {
    expect(matchCompiledPattern(compileOk("localhost"), "localhost")).toEqual(
      {},
    );
  });
});

describe("isOpenSharedHostPattern", () => {
  it("flags whole-label wildcards directly under shared hosts", () => {
    expect(isOpenSharedHostPattern("*.vercel.app")).toBe(true);
    expect(isOpenSharedHostPattern("{env}.netlify.app")).toBe(true);
    expect(isOpenSharedHostPattern("straightarrow-rms-*.vercel.app")).toBe(
      false,
    );
    expect(isOpenSharedHostPattern("*.straightarrow.ai")).toBe(false);
  });
});
