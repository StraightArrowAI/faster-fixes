import { NextRequest, NextResponse } from "next/server";
import { agentError } from "../../_utils/agent-error";
import { getProjectColumns } from "../../_utils/agent-feedback";
import { ListColumnsQuerySchema } from "../../_utils/agent.schema";
import {
  isAuthFailure,
  requireAgentAuth,
} from "../../_utils/require-agent-auth";
import { resolveProjectId } from "../../_utils/resolve-project-id";

export async function listColumns(req: NextRequest) {
  const auth = await requireAgentAuth(
    req.headers.get("authorization"),
    "feedbacks:read",
    "agent:read",
  );
  if (isAuthFailure(auth)) return auth;

  const parsed = ListColumnsQuerySchema.safeParse({
    project: req.nextUrl.searchParams.get("project") ?? undefined,
  });
  if (!parsed.success) {
    return agentError("Validation failed", "VALIDATION_ERROR", 422);
  }

  const projectId = resolveProjectId(
    parsed.data.project,
    auth.organization.projects,
  );
  if (!projectId) {
    return agentError("Project not found", "NOT_FOUND", 404);
  }

  const columns = await getProjectColumns(projectId);

  return NextResponse.json({
    columns: columns.map((c) => ({
      id: c.id,
      name: c.name,
      status: c.category,
      position: c.position,
    })),
  });
}
