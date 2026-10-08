"use client";

import { useTRPC } from "@/lib/trpc/trpc-client";
import { matchQueryStatus } from "@/utils/tanstack-query/match-query-status";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Send } from "lucide-react";
import * as React from "react";

import type { GetReviewersOutput } from "../get-reviewers.trpc.query";
import { SendReviewerLinksForm } from "./send-reviewer-links-form.client";

type SendReviewerLinksDialogProps = {
  projectId: string;
  reviewer: GetReviewersOutput[number];
};

export function SendReviewerLinksDialog({
  projectId,
  reviewer,
}: SendReviewerLinksDialogProps) {
  const trpc = useTRPC();
  const [open, setOpen] = React.useState(false);

  const domainsQuery = useQuery({
    ...trpc.authenticated.projects.domains.list.queryOptions({ projectId }),
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Send className="size-4" />
          Send link
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send link</DialogTitle>
          <DialogDescription>
            Email {reviewer.name} their personal link for the selected domains.
          </DialogDescription>
        </DialogHeader>
        {matchQueryStatus(domainsQuery, {
          Loading: <Skeleton className="h-56 w-full" />,
          Errored: (
            <p className="text-destructive text-sm">
              Failed to load the project domains. Try again later.
            </p>
          ),
          Empty: (
            <p className="text-muted-foreground text-sm">
              Add a domain in project settings before sending links.
            </p>
          ),
          dataKey: "domains",
          Success: ({ data }) => (
            <SendReviewerLinksForm
              projectId={projectId}
              reviewer={reviewer}
              domains={data.domains}
              onSent={() => setOpen(false)}
            />
          ),
        })}
      </DialogContent>
    </Dialog>
  );
}
