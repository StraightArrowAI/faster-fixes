"use client";

import { Badge } from "@workspace/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

import { CopyReviewerLinkMenu } from "./copy-reviewer-link-menu.client";
import type { GetReviewersOutput } from "./get-reviewers.trpc.query";
import { DeleteReviewerButton } from "./delete/delete-reviewer-button.client";
import { RestoreReviewerButton } from "./restore/restore-reviewer-button.client";
import { RevokeReviewerButton } from "./revoke/revoke-reviewer-button.client";
import { SendReviewerLinksDialog } from "./send/send-reviewer-links-dialog.client";

type ReviewersTableProps = {
  projectId: string;
  reviewers: GetReviewersOutput;
};

const SENT_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

function formatSentDate(date: Date | string): string {
  return SENT_DATE_FORMAT.format(new Date(date));
}

export function ReviewersTable({ projectId, reviewers }: ReviewersTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Feedback</TableHead>
          <TableHead>Sent</TableHead>
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
              {reviewer.sent.length > 0 ? (
                <ul className="flex flex-col gap-0.5 text-xs">
                  {reviewer.sent.map((send) => (
                    <li key={send.domainId} className="flex gap-1">
                      <span className="max-w-48 truncate font-mono">
                        {send.host}
                      </span>
                      <span className="text-muted-foreground shrink-0">
                        · {formatSentDate(send.lastSentAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-muted-foreground text-xs">Not sent</span>
              )}
            </TableCell>
            <TableCell>
              {reviewer.links.length > 0 ? (
                <CopyReviewerLinkMenu links={reviewer.links} />
              ) : (
                // Legacy reviewers only have a token hash; a send issues a
                // new token that links can be rebuilt from.
                <span className="text-muted-foreground text-xs">
                  Send a link to issue a new one
                </span>
              )}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1">
                {reviewer.isActive ? (
                  <>
                    <SendReviewerLinksDialog
                      projectId={projectId}
                      reviewer={reviewer}
                    />
                    <RevokeReviewerButton
                      projectId={projectId}
                      reviewerId={reviewer.id}
                      reviewerName={reviewer.name}
                    />
                  </>
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
