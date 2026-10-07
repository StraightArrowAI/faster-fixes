"use client";

import { Separator } from "@workspace/ui/components/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { format, formatDistanceToNow } from "date-fns";
import { ExternalLink, ImageOff, VideoOff } from "lucide-react";
import type { GetFeedbackColumnsOutput } from "@/app/(authenticated)/(project)/settings/_features/board-columns/get-feedback-columns.trpc.query";
import type { FeedbackItem } from "../get-feedback.trpc.query";
import { AssigneeSelect } from "./assignee-select.client";
import { CopyFeedbackMarkdown } from "./copy-feedback-markdown.client";
import { RecordingPlayer } from "./recording-player.client";
import { ScreenshotDialog } from "./screenshot-dialog.client";
import { StatusSelect } from "./status-select.client";
import { TrackersSection } from "./trackers-section.client";
import { ViewDiagnosticsDialog } from "./view-diagnostics-dialog.client";

type FeedbackDetailPanelProps = {
  feedback: FeedbackItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  columns: GetFeedbackColumnsOutput;
  hasGitHubLink?: boolean;
  hasLinearLink?: boolean;
  hasJiraLink?: boolean;
};

function formatBrowserMeta(f: FeedbackItem) {
  const parts: string[] = [];
  if (f.browserName) {
    parts.push(
      f.browserVersion ? `${f.browserName} ${f.browserVersion}` : f.browserName,
    );
  }
  if (f.os) parts.push(f.os);
  if (f.viewportWidth && f.viewportHeight) {
    parts.push(`${f.viewportWidth}\u00d7${f.viewportHeight}`);
  }
  return parts.join(" \u00b7 ");
}

export function FeedbackDetailPanel({
  feedback,
  open,
  onOpenChange,
  projectId,
  columns,
  hasGitHubLink = false,
  hasLinearLink = false,
  hasJiraLink = false,
}: FeedbackDetailPanelProps) {
  if (!feedback) return null;

  const browserMeta = formatBrowserMeta(feedback);
  const tagEntries = Object.entries(feedback.tags);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="sr-only">Feedback detail</SheetTitle>
          <SheetDescription className="sr-only">
            View and manage feedback details
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 p-4 pt-0">
          {/* Page URL */}
          <div className="flex items-center justify-between gap-2">
            <a
              href={feedback.pageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary inline-flex min-w-0 items-center gap-1.5 text-sm font-medium hover:underline"
            >
              <span className="truncate">{feedback.pageUrl}</span>
              <ExternalLink className="size-3.5 shrink-0" />
            </a>
            <CopyFeedbackMarkdown feedback={feedback} />
          </div>

          {/* Comment */}
          <div>
            <h4 className="text-muted-foreground mb-1 text-xs font-medium uppercase">
              Comment
            </h4>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {feedback.comment}
            </p>
          </div>

          <Separator />

          {/* Screenshot */}
          <div>
            <h4 className="text-muted-foreground mb-2 text-xs font-medium uppercase">
              Screenshot
            </h4>
            {feedback.screenshotUrl ? (
              <div className="flex flex-col gap-2">
                <ScreenshotDialog src={feedback.screenshotUrl} />
                <div className="text-muted-foreground flex flex-col gap-0.5 text-xs">
                  {feedback.clickX != null && feedback.clickY != null && (
                    <span>
                      Click: ({Math.round(feedback.clickX)},{" "}
                      {Math.round(feedback.clickY)})
                    </span>
                  )}
                  {feedback.selector && (
                    <span>Selector: {feedback.selector}</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-md border border-dashed py-8">
                <ImageOff className="size-8 opacity-50" />
                <span className="text-xs">No screenshot captured</span>
              </div>
            )}
          </div>

          {/* Screen recording. Every report predating this feature, and every
              report whose reviewer chose not to record, renders the empty
              branch — the section is always present so its absence reads as
              "nothing was recorded" rather than "something failed to load". */}
          <div>
            <h4 className="text-muted-foreground mb-2 text-xs font-medium uppercase">
              Screen recording
            </h4>
            {feedback.recordingUrl ? (
              <RecordingPlayer
                src={feedback.recordingUrl}
                durationMs={feedback.recordingDurationMs}
              />
            ) : (
              <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-md border border-dashed py-8">
                <VideoOff className="size-8 opacity-50" />
                <span className="text-xs">No recording captured</span>
              </div>
            )}
          </div>

          {/* Element context from metadata */}
          {feedback.metadata &&
            (() => {
              const md = feedback.metadata as Record<string, unknown>;
              const hasContext =
                md.elementDescription || md.reactComponentPath || md.sourceFile;
              if (!hasContext) return null;
              return (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                      Element
                    </h4>
                    <div className="flex flex-col gap-1 text-sm">
                      {typeof md.elementDescription === "string" && (
                        <p>{md.elementDescription}</p>
                      )}
                      {typeof md.reactComponentPath === "string" && (
                        <p className="text-muted-foreground font-mono text-xs">
                          {md.reactComponentPath}
                        </p>
                      )}
                      {typeof md.sourceFile === "string" && (
                        <p className="text-muted-foreground font-mono text-xs">
                          {md.sourceFile}
                        </p>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}

          {tagEntries.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                  Tags
                </h4>
                <dl className="flex flex-col gap-0.5 text-sm">
                  {tagEntries.map(([key, value]) => (
                    <div key={key} className="flex min-w-0 gap-1">
                      <dt className="text-muted-foreground shrink-0 font-mono text-xs leading-5">
                        {key}:
                      </dt>
                      <dd className="min-w-0 break-words">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </>
          )}

          {/* Browser Metadata */}
          {browserMeta && (
            <>
              <Separator />
              <div>
                <h4 className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                  Browser
                </h4>
                <p className="text-sm">{browserMeta}</p>
              </div>
            </>
          )}

          <Separator />

          {/* Diagnostics */}
          <div>
            <h4 className="text-muted-foreground mb-2 text-xs font-medium uppercase">
              Diagnostics
            </h4>
            <ViewDiagnosticsDialog
              projectId={projectId}
              feedbackId={feedback.id}
            />
          </div>

          <Separator />

          <StatusSelect feedback={feedback} columns={columns} />

          <TrackersSection
            feedbackId={feedback.id}
            projectId={projectId}
            hasGitHubLink={hasGitHubLink}
            hasLinearLink={hasLinearLink}
            hasJiraLink={hasJiraLink}
            githubIssueLink={feedback.issueLink}
            linearIssueLink={feedback.linearIssueLink}
            jiraIssueLink={feedback.jiraIssueLink}
          />

          <AssigneeSelect
            feedbackId={feedback.id}
            value={feedback.assignee?.id ?? null}
          />

          <Separator />

          {/* Timestamps */}
          <div className="text-muted-foreground flex flex-col gap-1 text-xs">
            <span>
              Submitted by {feedback.reviewer.name} on{" "}
              {format(new Date(feedback.createdAt), "MMM d, yyyy")}
            </span>
            <span>
              Last updated{" "}
              {formatDistanceToNow(new Date(feedback.updatedAt), {
                addSuffix: true,
              })}
            </span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
