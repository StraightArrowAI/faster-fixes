import { hasScope } from "@/server/api/check-agent-scope";
import type { ResolvedAgentToken } from "@/server/api/resolve-agent-token";
import {
  COMMENT_AUTHOR_INCLUDE,
  describeCommentAuthor,
} from "@/server/feedback/comment-author";
import { prisma } from "@workspace/db";
import type { NextRequest } from "next/server";
import { agentError } from "./agent-error";
import { FeedbackIdSchema } from "./agent.schema";

/** Feedback in any Project of the token's organization, or null. */
export function findAgentFeedback(agentToken: ResolvedAgentToken, id: string) {
  return prisma.feedback.findFirst({
    where: {
      id,
      projectId: { in: agentToken.organization.projects.map((p) => p.id) },
    },
    select: { id: true, projectId: true, status: true, columnId: true },
  });
}

export function getProjectColumns(projectId: string) {
  return prisma.feedbackColumn.findMany({
    where: { projectId },
    orderBy: { position: "asc" },
    select: {
      id: true,
      name: true,
      category: true,
      position: true,
      projectId: true,
    },
  });
}

export async function parseFeedbackIdParam(params: Promise<{ id: string }>) {
  const { id } = await params;
  const parsed = FeedbackIdSchema.safeParse(id);
  return parsed.success ? parsed.data : null;
}

export async function readJsonBody(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return undefined;
  }
}

// A comment attached to a move or status change still needs the comment
// scope; checked before any write so a 403 never leaves a half-done call.
export function requireCommentScope(
  agentToken: ResolvedAgentToken,
  comment: string | undefined,
) {
  if (
    comment === undefined ||
    hasScope(agentToken.scopes, "feedbacks:comment")
  ) {
    return null;
  }
  return agentError(
    "Adding a comment requires the feedbacks:comment permission",
    "FORBIDDEN",
    403,
  );
}

export function createAgentComment(
  agentToken: ResolvedAgentToken,
  input: {
    feedbackId: string;
    body: string;
    transition?: { from: string | null; to: string | null };
  },
) {
  return prisma.feedbackComment.create({
    data: {
      feedbackId: input.feedbackId,
      agentTokenId: agentToken.id,
      agentName: agentToken.name,
      body: input.body,
      fromColumnName: input.transition?.from ?? null,
      toColumnName: input.transition?.to ?? null,
    },
    include: COMMENT_AUTHOR_INCLUDE,
  });
}

type CommentRow = Awaited<ReturnType<typeof createAgentComment>>;

export function serializeAgentComment(c: CommentRow) {
  const author = describeCommentAuthor(c);
  return {
    id: c.id,
    body: c.body,
    createdAt: c.createdAt,
    editedAt: c.editedAt,
    author: { type: author.type, name: author.name },
    fromColumn: c.fromColumnName,
    toColumn: c.toColumnName,
  };
}
