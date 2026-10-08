import { describe, expect, it } from "vitest";

import { selectReviewerLinkDomains } from "./reviewer-link-domains";

const primary = { id: "p", isPrimary: true };
const altA = { id: "a", isPrimary: false };
const altB = { id: "b", isPrimary: false };
const projectDomains = [primary, altA, altB];

describe("selectReviewerLinkDomains", () => {
  it("returns the primary alone when only the primary is requested", () => {
    expect(selectReviewerLinkDomains(projectDomains, ["p"])).toEqual({
      ok: true,
      domains: [primary],
    });
  });

  it("keeps the project order with the primary first", () => {
    expect(selectReviewerLinkDomains(projectDomains, ["b", "p", "a"])).toEqual({
      ok: true,
      domains: [primary, altA, altB],
    });
  });

  it("ignores duplicate ids", () => {
    expect(selectReviewerLinkDomains(projectDomains, ["p", "a", "a"])).toEqual({
      ok: true,
      domains: [primary, altA],
    });
  });

  it("rejects a domain from another project", () => {
    const result = selectReviewerLinkDomains(projectDomains, ["p", "x"]);
    expect(result.ok).toBe(false);
  });

  it("rejects a selection without the primary", () => {
    expect(selectReviewerLinkDomains(projectDomains, ["a"])).toEqual({
      ok: false,
      error: "The primary domain must be included.",
    });
  });

  it("rejects when the project has no primary", () => {
    const result = selectReviewerLinkDomains([altA], ["a"]);
    expect(result.ok).toBe(false);
  });
});
