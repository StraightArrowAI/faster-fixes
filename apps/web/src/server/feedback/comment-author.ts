type CommentAuthorSource = {
  author: {
    id: string;
    user: { name: string; email: string; image: string | null };
  } | null;
  agentName: string | null;
};

export type CommentAuthor = {
  type: "member" | "agent" | "former_member";
  id: string | null;
  name: string;
  image: string | null;
};

// One mapping for the dashboard thread and the agent API, so both name a
// comment's author the same way.
export function describeCommentAuthor(c: CommentAuthorSource): CommentAuthor {
  if (c.author) {
    return {
      type: "member",
      id: c.author.id,
      name: c.author.user.name || c.author.user.email,
      image: c.author.user.image,
    };
  }
  if (c.agentName) {
    return { type: "agent", id: null, name: c.agentName, image: null };
  }
  return {
    type: "former_member",
    id: null,
    name: "Former member",
    image: null,
  };
}

export const COMMENT_AUTHOR_INCLUDE = {
  author: {
    select: {
      id: true,
      user: { select: { name: true, email: true, image: true } },
    },
  },
} as const;
