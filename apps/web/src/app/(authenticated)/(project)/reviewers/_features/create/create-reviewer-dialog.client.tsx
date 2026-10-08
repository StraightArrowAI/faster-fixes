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
import { Plus } from "lucide-react";
import * as React from "react";

import { CreateReviewerForm } from "./create-reviewer-form.client";

type CreateReviewerDialogProps = {
  projectId: string;
  onCreated: (shareUrl: string) => void;
};

export function CreateReviewerDialog({
  projectId,
  onCreated,
}: CreateReviewerDialogProps) {
  const trpc = useTRPC();
  const [open, setOpen] = React.useState(false);

  const domainsQuery = useQuery({
    ...trpc.authenticated.projects.domains.list.queryOptions({ projectId }),
    enabled: open,
  });

  const handleCreated = (shareUrl: string) => {
    onCreated(shareUrl);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          Add reviewer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New reviewer</DialogTitle>
          <DialogDescription>
            Each reviewer gets a personal link that opens your site with the
            feedback widget signed in as them.
          </DialogDescription>
        </DialogHeader>
        {matchQueryStatus(domainsQuery, {
          Loading: <Skeleton className="h-64 w-full" />,
          Errored: (
            <p className="text-destructive text-sm">
              Failed to load the project domains. Try again later.
            </p>
          ),
          Empty: (
            <p className="text-muted-foreground text-sm">
              Add a domain in project settings before adding reviewers.
            </p>
          ),
          dataKey: "domains",
          Success: ({ data }) => (
            <CreateReviewerForm
              projectId={projectId}
              domains={data.domains}
              onCreated={handleCreated}
            />
          ),
        })}
      </DialogContent>
    </Dialog>
  );
}
