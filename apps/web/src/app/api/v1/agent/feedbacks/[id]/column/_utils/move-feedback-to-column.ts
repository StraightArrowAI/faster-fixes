import {
  boardColumnName,
  findColumnByReference,
} from "@/server/feedback/board-columns";
import { moveFeedbacksToColumn } from "@/server/feedback/move-feedbacks-to-column";
import { prisma } from "@workspace/db";
import { NextRequest, NextResponse } from "next/server";
import { agentError } from "../../../../_utils/agent-error";
import {
  createAgentComment,
  findAgentFeedback,
  getProjectColumns,
  parseFeedbackIdParam,
  readJsonBody,
  requireCommentScope,
} from "../../../../_utils/agent-feedback";
import { MoveFeedbackColumnSchema } from "../../../../_utils/agent.schema";
import {
  isAuthFailure,
  requireAgentAuth,
} from "../../../../_utils/require-agent-auth";

type RouteContext = { params: Promise<{ id: string }> };

// A column move is a status write (the column carries its category), so it
// shares feedbacks:update_status rather than needing a scope older tokens lack.
export async function moveFeedbackToColumn(
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

  const feedbackId = await parseFeedbackIdParam(context.params);
  if (!feedbackId) {
    return agentError("Invalid feedback ID", "VALIDATION_ERROR", 422);
  }

  const parsed = MoveFeedbackColumnSchema.safeParse(await readJsonBody(req));
  if (!parsed.success) {
    return agentError("Validation failed", "VALIDATION_ERROR", 422);
  }

  const scopeError = requireCommentScope(agentToken, parsed.data.comment);
  if (scopeError) return scopeError;

  const feedback = await findAgentFeedback(agentToken, feedbackId);
  if (!feedback) {
    return agentError("Feedback not found", "NOT_FOUND", 404);
  }

  const columns = await getProjectColumns(feedback.projectId);
  const column = findColumnByReference(columns, parsed.data.column);
  if (!column) {
    // Listing the valid names lets an agent correct a guess in one retry.
    return agentError("Column not found", "COLUMN_NOT_FOUND", 404, {
      extra: { columns: columns.map((c) => c.name) },
    });
  }

  const fromName = boardColumnName(columns, feedback);
  await moveFeedbacksToColumn(prisma, {
    feedbackIds: [feedback.id],
    column,
    actor: "agent",
  });

  const comment = parsed.data.comment
    ? await createAgentComment(agentToken, {
        feedbackId: feedback.id,
        body: parsed.data.comment,
        // A same-column call records a plain comment, not "X → X".
        transition:
          fromName === column.name
            ? undefined
            : { from: fromName, to: column.name },
      })
    : null;

  const updated = await prisma.feedback.findUniqueOrThrow({
    where: { id: feedback.id },
    select: { id: true, status: true, updatedAt: true },
  });

  console.info(
    `[agent-api] feedbacks:move tokenId=${agentToken.id} feedbackId=${feedback.id} ${fromName ?? "?"} -> ${column.name}`,
  );

  return NextResponse.json({
    id: updated.id,
    status: updated.status,
    column: { id: column.id, name: column.name },
    updatedAt: updated.updatedAt,
    comment: comment ? { id: comment.id } : null,
  });
}
