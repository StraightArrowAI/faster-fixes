"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Check, Copy } from "lucide-react";
import * as React from "react";

import type { GetReviewersOutput } from "./get-reviewers.trpc.query";
import { DeleteReviewerButton } from "./delete/delete-reviewer-button.client";
import { RestoreReviewerButton } from "./restore/restore-reviewer-button.client";
import { RevokeReviewerButton } from "./revoke/revoke-reviewer-button.client";

type ReviewersTableProps = {
  projectId: string;
  reviewers: GetReviewersOutput;
};

// Host and path only; the full URL with its token stays behind "Copy link".
function formatLinkTarget(linkUrl: string | null): string {
  if (!linkUrl) return "Main domain";
  try {
    const url = new URL(linkUrl);
    return `${url.host}${url.pathname === "/" ? "" : url.pathname}`;
  } catch {
    return "Main domain";
  }
}

export function ReviewersTable({ projectId, reviewers }: ReviewersTableProps) {
  const [copied, setCopied] = React.useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Feedback</TableHead>
          <TableHead>Share link</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {reviewers.map((reviewer) => (
          <TableRow key={reviewer.id}>
            <TableCell className="font-medium">{reviewer.name}</TableCell>
            <TableCell>
              {reviewer.isActive ? (
                <Badge variant="default">Active</Badge>
              ) : (
                <Badge variant="secondary">Revoked</Badge>
              )}
            </TableCell>
            <TableCell>{reviewer.feedbackCount}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(reviewer.shareUrl, reviewer.id)}
                >
                  {copied === reviewer.id ? (
                    <>
                      <Check className="text-success size-3" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="size-3" />
                      Copy link
                    </>
                  )}
                </Button>
                <span
                  className="text-muted-foreground max-w-56 truncate text-xs"
                  title={reviewer.linkUrl ?? undefined}
                >
                  {formatLinkTarget(reviewer.linkUrl)}
                </span>
              </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1">
                {reviewer.isActive ? (
                  <RevokeReviewerButton
                    projectId={projectId}
                    reviewerId={reviewer.id}
                    reviewerName={reviewer.name}
                  />
                ) : (
                  <>
                    <RestoreReviewerButton
                      projectId={projectId}
                      reviewerId={reviewer.id}
                    />
                    <DeleteReviewerButton
                      projectId={projectId}
                      reviewerId={reviewer.id}
                      reviewerName={reviewer.name}
                    />
                  </>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
