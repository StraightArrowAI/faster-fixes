import { NextRequest, NextResponse } from "next/server";
import { agentError } from "../../../../_utils/agent-error";
import {
  createAgentComment,
  findAgentFeedback,
  parseFeedbackIdParam,
  readJsonBody,
  serializeAgentComment,
} from "../../../../_utils/agent-feedback";
import { CreateAgentCommentSchema } from "../../../../_utils/agent.schema";
import {
  isAuthFailure,
  requireAgentAuth,
} from "../../../../_utils/require-agent-auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function createComment(req: NextRequest, context: RouteContext) {
  const auth = await requireAgentAuth(
    req.headers.get("authorization"),
    "feedbacks:comment",
    "agent:write",
  );
  if (isAuthFailure(auth)) return auth;

  const feedbackId = await parseFeedbackIdParam(context.params);
  if (!feedbackId) {
    return agentError("Invalid feedback ID", "VALIDATION_ERROR", 422);
  }

  const parsed = CreateAgentCommentSchema.safeParse(await readJsonBody(req));
  if (!parsed.success) {
    return agentError("Validation failed", "VALIDATION_ERROR", 422);
  }

  const feedback = await findAgentFeedback(auth, feedbackId);
  if (!feedback) {
    return agentError("Feedback not found", "NOT_FOUND", 404);
  }

  const comment = await createAgentComment(auth, {
    feedbackId: feedback.id,
    body: parsed.data.body,
  });

  console.info(
    `[agent-api] feedbacks:comment tokenId=${auth.id} feedbackId=${feedback.id}`,
  );

  return NextResponse.json(serializeAgentComment(comment), { status: 201 });
}
