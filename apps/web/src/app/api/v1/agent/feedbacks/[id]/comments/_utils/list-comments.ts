import { COMMENT_AUTHOR_INCLUDE } from "@/server/feedback/comment-author";
import { prisma } from "@workspace/db";
import { NextRequest, NextResponse } from "next/server";
import { agentError } from "../../../../_utils/agent-error";
import {
  findAgentFeedback,
  parseFeedbackIdParam,
  serializeAgentComment,
} from "../../../../_utils/agent-feedback";
import {
  isAuthFailure,
  requireAgentAuth,
} from "../../../../_utils/require-agent-auth";

type RouteContext = { params: Promise<{ id: string }> };

// Comments are part of the Feedback an agent can already read, so reading
// them needs no scope beyond feedbacks:read.
export async function listComments(req: NextRequest, context: RouteContext) {
  const auth = await requireAgentAuth(
    req.headers.get("authorization"),
    "feedbacks:read",
    "agent:read",
  );
  if (isAuthFailure(auth)) return auth;

  const feedbackId = await parseFeedbackIdParam(context.params);
  if (!feedbackId) {
    return agentError("Invalid feedback ID", "VALIDATION_ERROR", 422);
  }

  const feedback = await findAgentFeedback(auth, feedbackId);
  if (!feedback) {
    return agentError("Feedback not found", "NOT_FOUND", 404);
  }

  const comments = await prisma.feedbackComment.findMany({
    where: { feedbackId: feedback.id },
    orderBy: { createdAt: "asc" },
    include: COMMENT_AUTHOR_INCLUDE,
  });

  return NextResponse.json({
    comments: comments.map(serializeAgentComment),
  });
}
