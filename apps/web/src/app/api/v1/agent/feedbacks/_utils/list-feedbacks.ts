import { formatFeedbackListAsMarkdown } from "@/app/_features/feedback/format-feedback-markdown";
import { readRecordingDurationMs } from "@/server/feedback/recording-metadata";
import { getSignedAssetUrl } from "@/server/storage/get-signed-asset-url";
import type { DiagnosticTrail } from "@fasterfixes/core";
import { prisma } from "@workspace/db";
import { NextRequest, NextResponse } from "next/server";
import { agentError } from "../../_utils/agent-error";
import { ListFeedbacksQuerySchema } from "../../_utils/agent.schema";
import {
  isAuthFailure,
  requireAgentAuth,
} from "../../_utils/require-agent-auth";
import { resolveProjectId } from "../../_utils/resolve-project-id";
import { getProjectColumns } from "../../_utils/agent-feedback";
import { parseFeedbackTags } from "@/app/(authenticated)/(project)/inbox/_features/parse-feedback-tags";
import {
  findColumnByReference,
  resolveBoardColumn,
} from "@/server/feedback/board-columns";

// Agent-facing spelling of the board's "no environment" filter.
const NO_ENVIRONMENT = "none";

export async function listFeedbacks(req: NextRequest) {
  const auth = await requireAgentAuth(
    req.headers.get("authorization"),
    "feedbacks:read",
    "agent:read",
  );
  if (isAuthFailure(auth)) return auth;
  const agentToken = auth;

  const { searchParams } = req.nextUrl;
  const parsed = ListFeedbacksQuerySchema.safeParse({
    status: searchParams.get("status") ?? undefined,
    page_url: searchParams.get("page_url") ?? undefined,
    project: searchParams.get("project") ?? undefined,
    format: searchParams.get("format") ?? undefined,
    env: searchParams.get("env") ?? undefined,
    column: searchParams.get("column") ?? undefined,
  });

  if (!parsed.success) {
    return agentError("Validation failed", "VALIDATION_ERROR", 422);
  }

  const { status, page_url, project, format, env, column } = parsed.data;

  const projectId = resolveProjectId(project, agentToken.organization.projects);
  if (!projectId) {
    return agentError("Project not found", "NOT_FOUND", 404);
  }

  const columns = await getProjectColumns(projectId);
  const columnFilter = column ? findColumnByReference(columns, column) : null;
  if (column && !columnFilter) {
    return agentError("Column not found", "COLUMN_NOT_FOUND", 404, {
      extra: { columns: columns.map((c) => c.name) },
    });
  }

  const feedbacks = await prisma.feedback.findMany({
    where: {
      projectId,
      ...(status ? { status } : {}),
      ...(page_url ? { pageUrl: page_url } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      reviewer: { select: { name: true } },
      assignee: { select: { user: { select: { name: true, email: true } } } },
      _count: { select: { comments: true } },
      screenshot: { select: { key: true, provider: true, bucket: true } },
      recording: {
        select: { key: true, provider: true, bucket: true, metadata: true },
      },
    },
  });

  // Column and env are derived (a null columnId means "first column of the
  // category", tags are JSON), so they filter in memory rather than in SQL.
  const withBoard = feedbacks
    .map((f) => ({
      f,
      tags: parseFeedbackTags(f.tags),
      column: resolveBoardColumn(columns, f),
    }))
    .filter(({ tags }) =>
      !env ? true : env === NO_ENVIRONMENT ? !tags.env : tags.env === env,
    )
    .filter(({ column: c }) => !columnFilter || c?.id === columnFilter.id);

  console.info(
    `[agent-api] feedbacks:list tokenId=${agentToken.id} project=${projectId} count=${withBoard.length}`,
  );

  const mapped = await Promise.all(
    withBoard.map(async ({ f, tags, column: c }) => ({
      id: f.id,
      status: f.status,
      // Archived feedback has no lane.
      column: c && f.status !== "closed" ? { id: c.id, name: c.name } : null,
      tags,
      assignee: f.assignee
        ? { name: f.assignee.user.name || f.assignee.user.email }
        : null,
      commentCount: f._count.comments,
      comment: f.comment,
      pageUrl: f.pageUrl,
      selector: f.selector,
      clickX: f.clickX,
      clickY: f.clickY,
      viewportWidth: f.viewportWidth,
      viewportHeight: f.viewportHeight,
      browserName: f.browserName,
      browserVersion: f.browserVersion,
      os: f.os,
      screenshotUrl: f.screenshot
        ? await getSignedAssetUrl(f.screenshot)
        : null,
      recordingUrl: f.recording ? await getSignedAssetUrl(f.recording) : null,
      recordingDurationMs: readRecordingDurationMs(f.recording?.metadata),
      metadata: f.metadata as Record<string, unknown> | null,
      diagnosticTrail: f.diagnosticTrail as DiagnosticTrail | null,
      reviewerName: f.reviewer.name,
      createdAt: f.createdAt,
    })),
  );

  if (format === "markdown") {
    return new NextResponse(
      formatFeedbackListAsMarkdown(
        mapped.map((m) => ({ ...m, columnName: m.column?.name ?? null })),
      ),
      {
        status: 200,
        headers: { "Content-Type": "text/markdown; charset=utf-8" },
      },
    );
  }

  return NextResponse.json({
    feedbacks: mapped,
    count: mapped.length,
  });
}
