import { describe, expect, it } from "vitest";

import { FeedbackTagsSchema, sanitizeAppTags } from "./feedback-tags.schema";
import { mergeFeedbackTags } from "./merge-feedback-tags";

describe("mergeFeedbackTags", () => {
  it("lets rule tags override app-supplied tags", () => {
    expect(
      mergeFeedbackTags({ env: "spoofed", account: "acme" }, { env: "dev" }),
    ).toEqual({ env: "dev", account: "acme" });
  });

  it("handles missing app tags", () => {
    expect(mergeFeedbackTags(undefined, { env: "dev" })).toEqual({
      env: "dev",
    });
  });
});

describe("FeedbackTagsSchema", () => {
  it("trims values", () => {
    expect(FeedbackTagsSchema.parse({ env: "  dev " })).toEqual({ env: "dev" });
  });

  it.each([
    [{ Env: "dev" }],
    [{ "1env": "dev" }],
    [{ env: "" }],
    [{ env: "   " }],
    [{ env: "x".repeat(65) }],
    [{ ["k".repeat(33)]: "v" }],
    [Object.fromEntries(Array.from({ length: 11 }, (_, i) => [`k${i}`, "v"]))],
  ])("rejects %j", (tags) => {
    expect(FeedbackTagsSchema.safeParse(tags).success).toBe(false);
  });
});

describe("sanitizeAppTags", () => {
  it("keeps valid entries and drops invalid ones", () => {
    expect(
      sanitizeAppTags({
        env: " dev ",
        Bad: "x",
        empty: "",
        n: 5,
        account: "acme",
      }),
    ).toEqual({ env: "dev", account: "acme" });
  });

  it("caps at 10 entries", () => {
    const many = Object.fromEntries(
      Array.from({ length: 15 }, (_, i) => [`k${i}`, "v"]),
    );
    expect(Object.keys(sanitizeAppTags(many))).toHaveLength(10);
  });

  it.each([null, undefined, "env=dev", ["dev"], 42])(
    "returns {} for %j",
    (value) => {
      expect(sanitizeAppTags(value)).toEqual({});
    },
  );
});
