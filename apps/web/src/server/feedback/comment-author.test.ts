import { describe, expect, it } from "vitest";

import { describeCommentAuthor } from "./comment-author";

describe("describeCommentAuthor", () => {
  it("names a member by name, falling back to email", () => {
    expect(
      describeCommentAuthor({
        author: { id: "m1", user: { name: "", email: "a@b.co", image: null } },
        agentName: null,
      }),
    ).toEqual({ type: "member", id: "m1", name: "a@b.co", image: null });
  });

  it("names an agent comment by its frozen token name", () => {
    expect(
      describeCommentAuthor({ author: null, agentName: "Claude Code" }),
    ).toEqual({ type: "agent", id: null, name: "Claude Code", image: null });
  });

  it("marks a removed member", () => {
    expect(describeCommentAuthor({ author: null, agentName: null })).toEqual({
      type: "former_member",
      id: null,
      name: "Former member",
      image: null,
    });
  });
});
