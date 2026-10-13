import { describe, expect, it } from "vitest";

import {
  CreateFeedbackCommentSchema,
  FeedbackCommentBodySchema,
  MAX_COMMENT_LENGTH,
} from "./feedback-comment.schema";

describe("FeedbackCommentBodySchema", () => {
  it("trims the body", () => {
    expect(FeedbackCommentBodySchema.parse("  Fixed in #42 \n")).toBe(
      "Fixed in #42",
    );
  });

  it("keeps inner line breaks", () => {
    expect(FeedbackCommentBodySchema.parse("a\n\nb")).toBe("a\n\nb");
  });

  it.each(["", "   ", "\n\t"])("rejects a blank body %j", (body) => {
    expect(FeedbackCommentBodySchema.safeParse(body).success).toBe(false);
  });

  it("rejects a body over the limit", () => {
    const body = "x".repeat(MAX_COMMENT_LENGTH + 1);
    expect(FeedbackCommentBodySchema.safeParse(body).success).toBe(false);
  });

  it("measures the limit after trimming", () => {
    const body = ` ${"x".repeat(MAX_COMMENT_LENGTH)} `;
    expect(FeedbackCommentBodySchema.safeParse(body).success).toBe(true);
  });
});

describe("CreateFeedbackCommentSchema", () => {
  it("accepts a comment without a transition", () => {
    expect(
      CreateFeedbackCommentSchema.safeParse({ feedbackId: "f1", body: "ok" })
        .success,
    ).toBe(true);
  });

  it("accepts a transition with an unknown source column", () => {
    const parsed = CreateFeedbackCommentSchema.parse({
      feedbackId: "f1",
      body: "ok",
      transition: { from: null, to: "Resolved" },
    });
    expect(parsed.transition).toEqual({ from: null, to: "Resolved" });
  });

  it("rejects a transition without a target", () => {
    expect(
      CreateFeedbackCommentSchema.safeParse({
        feedbackId: "f1",
        body: "ok",
        transition: { from: "New", to: "" },
      }).success,
    ).toBe(false);
  });
});
