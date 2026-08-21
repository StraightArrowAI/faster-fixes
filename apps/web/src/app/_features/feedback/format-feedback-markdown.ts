/**
 * Shared markdown formatter for feedback items.
 * Used by both the dashboard export and the agent API.
 */

import type { DiagnosticTrail } from "@fasterfixes/core";

export type FeedbackForMarkdown = {
  id: string;
  status: string;
  comment: string;
  pageUrl: string;
  selector: string | null;
  clickX: number | null;
  clickY: number | null;
  viewportWidth: number | null;
  viewportHeight: number | null;
  browserName: string | null;
  browserVersion: string | null;
  os: string | null;
  screenshotUrl: string | null;
  // Optional: the widget-facing list doesn't carry a recording. Absent or null
  // → the Screen recording section is skipped entirely.
  recordingUrl?: string | null;
  recordingDurationMs?: number | null;
  metadata: Record<string, unknown> | null;
  // Optional: the dashboard's lean list query doesn't load it; the agent API and
  // issue creators do. Absent → the Diagnostics section is skipped.
  diagnosticTrail?: DiagnosticTrail | null;
};

export function formatFeedbackAsMarkdown(f: FeedbackForMarkdown): string {
  const md = f.metadata;
  const lines: string[] = [];

  lines.push(`# Feedback ${f.id}`);
  lines.push("");
  lines.push(`**Status:** ${f.status}`);
  lines.push("");
  lines.push(
    "A user left feedback on your application. Review and address the issue described below.",
  );

  // Where to look — most actionable info first
  const locationLines: string[] = [];
  locationLines.push(`**Page URL:** ${f.pageUrl}`);
  if (md?.reactComponentPath) {
    locationLines.push(`**Component tree:** \`${md.reactComponentPath}\``);
  }
  if (md?.sourceFile) {
    locationLines.push(`**Source file:** \`${md.sourceFile}\``);
  }
  if (f.selector) locationLines.push(`**DOM selector:** \`${f.selector}\``);
  if (md?.elementDescription) {
    locationLines.push(`**Element:** ${md.elementDescription}`);
  }

  lines.push("");
  lines.push("## Where to look");
  lines.push("");
  lines.push(...locationLines);

  // What's wrong — the user's description as a blockquote
  lines.push("");
  lines.push("## What's wrong");
  lines.push("");
  const quotedComment = f.comment
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
  lines.push(quotedComment);

  if (md?.nearbyText) {
    lines.push("");
    lines.push(`**Nearby text:** "${md.nearbyText}"`);
  }

  // Environment — only if there's something to show
  const envLines: string[] = [];
  if (f.browserName) {
    envLines.push(
      `**Browser:** ${f.browserName}${f.browserVersion ? ` ${f.browserVersion}` : ""}`,
    );
  }
  if (f.os) envLines.push(`**OS:** ${f.os}`);
  if (f.viewportWidth && f.viewportHeight) {
    envLines.push(`**Viewport:** ${f.viewportWidth}\u00d7${f.viewportHeight}`);
  }

  if (envLines.length > 0) {
    lines.push("");
    lines.push("## Environment");
    lines.push("");
    lines.push(...envLines);
  }

  // Diagnostics — console + network captured before submission
  const diagnosticLines = formatDiagnosticTrailLines(f.diagnosticTrail);
  if (diagnosticLines.length > 0) {
    lines.push("");
    lines.push("## Diagnostics");
    lines.push("");
    lines.push(...diagnosticLines);
  }

  // Screenshot with instruction for multimodal AI agents
  if (f.screenshotUrl) {
    lines.push("");
    lines.push("## Screenshot");
    lines.push("");
    lines.push(
      "Examine this screenshot for visual context of the reported feedback:",
    );
    lines.push(`![Feedback screenshot](${f.screenshotUrl})`);
  }

  // Screen recording — a link, not an embed: markdown has no video element, and
  // the URL is a short-lived presigned one, so it is labelled as expiring.
  if (f.recordingUrl) {
    lines.push("");
    lines.push("## Screen recording");
    lines.push("");
    const length =
      typeof f.recordingDurationMs === "number"
        ? ` (${Math.round(f.recordingDurationMs / 1000)}s)`
        : "";
    lines.push(
      `A screen recording of the sequence that produced this feedback is available${length}. The link is presigned and expires:`,
    );
    lines.push(`[Watch the recording](${f.recordingUrl})`);
  }

  return lines.join("\n");
}

export function formatFeedbackListAsMarkdown(
  feedbacks: FeedbackForMarkdown[],
): string {
  if (feedbacks.length === 0) return "No feedback items found.";
  return feedbacks
    .map((f) => formatFeedbackAsMarkdown(f))
    .join("\n\n---\n\n");
}

/**
 * Render a Diagnostic Trail as markdown bullet lines (Console + Network).
 * Returns `[]` when there is nothing to show, so callers can wrap it in their
 * own heading or `<details>` block only when content exists. Shared so the
 * agent API and the GitHub/Linear issue bodies stay consistent.
 */
export function formatDiagnosticTrailLines(
  trail: DiagnosticTrail | null | undefined,
): string[] {
  if (!trail) return [];
  const consoleEntries = trail.console ?? [];
  const networkEntries = trail.network ?? [];
  if (consoleEntries.length === 0 && networkEntries.length === 0) return [];

  const lines: string[] = [];

  if (consoleEntries.length > 0) {
    lines.push("**Console**", "");
    for (const entry of consoleEntries) {
      lines.push(`- \`${entry.level}\` ${collapseWhitespace(entry.message)}`);
    }
    lines.push("");
  }

  if (networkEntries.length > 0) {
    lines.push("**Network**", "");
    for (const entry of networkEntries) {
      const status = entry.status === 0 ? "ERR" : String(entry.status);
      lines.push(
        `- \`${entry.method}\` ${entry.url} → ${status} (${Math.round(entry.duration)}ms)`,
      );
    }
  }

  return lines;
}

// Console messages can be multi-line; flatten so each entry stays one bullet.
function collapseWhitespace(value: string): string {
  return value.replace(/\s*\n\s*/g, " ").trim();
}
