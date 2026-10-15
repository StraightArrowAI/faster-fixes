import { inngest } from "@/server/inngest";
import { prisma } from "@workspace/db";
import { NextRequest, NextResponse } from "next/server";
import { agentError } from "../../../../_utils/agent-error";
import {
  FeedbackIdSchema,
  UpdateFeedbackStatusSchema,
} from "../../../../_utils/agent.schema";
import {
  isAuthFailure,
  requireAgentAuth,
} from "../../../../_utils/require-agent-auth";
import { updateFeedbackStatuses } from "@/server/feedback/update-feedback-statuses";
import {
  boardColumnName,
  resolveBoardColumn,
} from "@/server/feedback/board-columns";
import {
  createAgentComment,
  findAgentFeedback,
  getProjectColumns,
  requireCommentScope,
} from "../../../../_utils/agent-feedback";

type RouteContext = { params: Promise<{ id: string }> };

export async function updateFeedbackStatus(
  req: NextRequest,
  context: RouteContext,
) {
  const auth = await requireAgentAuth(
    req.headers.get("authorization"),
    "feedbacks:update_status",
    "agent:write",
  );
  if (isAuthFailure(auth)) return auth;
  const agentToken = auth;

  const { id } = await context.params;
  const idParsed = FeedbackIdSchema.safeParse(id);
  if (!idParsed.success) {
    return agentError("Invalid feedback ID", "VALIDATION_ERROR", 422);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return agentError("Invalid JSON body", "VALIDATION_ERROR", 422);
  }

  const parsed = UpdateFeedbackStatusSchema.safeParse(body);
  if (!parsed.success) {
    return agentError("Validation failed", "VALIDATION_ERROR", 422);
  }

  const scopeError = requireCommentScope(agentToken, parsed.data.comment);
  if (scopeError) return scopeError;

  const feedback = await findAgentFeedback(agentToken, idParsed.data);

  if (!feedback) {
    return agentError("Feedback not found", "NOT_FOUND", 404);
  }

  const columns = await getProjectColumns(feedback.projectId);
  const previousStatus = feedback.status;
  await updateFeedbackStatuses(prisma, { id: feedback.id }, parsed.data.status);
  const updated = await prisma.feedback.findUniqueOrThrow({
    where: { id: feedback.id },
    select: { id: true, status: true, columnId: true, updatedAt: true },
  });

  // A re-asserted status keeps its lane; record a move only when the card
  // actually changed lanes.
  const fromName = boardColumnName(columns, feedback);
  const toName = boardColumnName(columns, updated);
  const comment = parsed.data.comment
    ? await createAgentComment(agentToken, {
        feedbackId: feedback.id,
        body: parsed.data.comment,
        transition:
          fromName === toName ? undefined : { from: fromName, to: toName },
      })
    : null;
  const column = resolveBoardColumn(columns, updated);

  console.info(
    `[agent-api] feedbacks:update_status tokenId=${agentToken.id} feedbackId=${feedback.id} ${previousStatus} -> ${parsed.data.status}`,
  );

  // Fire-and-forget: sync status to GitHub if linked. Skip on no-op — a
  // redundant status set (common when an agent loops over a queue) shouldn't
  // re-fan-out to external trackers, which is the costly part of a write.
  if (parsed.data.status !== previousStatus) {
    inngest
      .send({
        name: "feedback/status-changed",
        // actor "agent": this endpoint is only reachable with an agent token.
        data: {
          feedbackId: feedback.id,
          newStatus: parsed.data.status,
          actor: "agent",
        },
      })
      .catch(() => {});
  }

  return NextResponse.json({
    id: updated.id,
    status: updated.status,
    column: column ? { id: column.id, name: column.name } : null,
    updatedAt: updated.updatedAt,
    comment: comment ? { id: comment.id } : null,
  });
}
