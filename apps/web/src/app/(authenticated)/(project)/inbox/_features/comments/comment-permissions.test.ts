import { describe, expect, it } from "vitest";

import { canDeleteComment, canEditComment } from "./comment-permissions";

const author = { id: "m1", role: "member" };

describe("canEditComment", () => {
  it("allows the author", () => {
    expect(canEditComment({ authorId: "m1" }, author)).toBe(true);
  });

  it.each(["owner", "admin"])("denies a non-author %s", (role) => {
    expect(canEditComment({ authorId: "m1" }, { id: "m2", role })).toBe(false);
  });

  it("denies everyone once the author has left", () => {
    expect(
      canEditComment({ authorId: null }, { id: "m2", role: "owner" }),
    ).toBe(false);
  });
});

describe("canDeleteComment", () => {
  it("allows the author", () => {
    expect(canDeleteComment({ authorId: "m1" }, author)).toBe(true);
  });

  it.each(["owner", "admin"])("allows a non-author %s", (role) => {
    expect(canDeleteComment({ authorId: "m1" }, { id: "m2", role })).toBe(true);
  });

  it("allows owners and admins to delete a former member's comment", () => {
    expect(
      canDeleteComment({ authorId: null }, { id: "m2", role: "admin" }),
    ).toBe(true);
  });

  it("denies another plain member", () => {
    expect(
      canDeleteComment({ authorId: "m1" }, { id: "m2", role: "member" }),
    ).toBe(false);
  });

  it("reads multi-role strings", () => {
    expect(
      canDeleteComment({ authorId: "m1" }, { id: "m2", role: "member,admin" }),
    ).toBe(true);
  });
});
