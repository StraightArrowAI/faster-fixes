"use client";

import { useTRPC } from "@/lib/trpc/trpc-client";
import { useMutation } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog";
import { Button } from "@workspace/ui/components/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useInvalidateProjectDomains } from "./use-invalidate-project-domains";

type DeleteProjectDomainButtonProps = {
  projectId: string;
  domainId: string;
  url: string;
};

export function DeleteProjectDomainButton({
  projectId,
  domainId,
  url,
}: DeleteProjectDomainButtonProps) {
  const trpc = useTRPC();
  const invalidate = useInvalidateProjectDomains(projectId);

  const deleteDomain = useMutation(
    trpc.authenticated.projects.domains.delete.mutationOptions({
      onSuccess: () => {
        invalidate();
        toast.success("Domain deleted");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive"
          aria-label={`Delete ${url}`}
        >
          <Trash2 className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete domain</AlertDialogTitle>
          <AlertDialogDescription>
            Delete <span className="font-mono font-medium">{url}</span>? Widget
            requests from this domain will be rejected, including from reviewer
            links sent for it. Existing feedback keeps its tags.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deleteDomain.mutate({ domainId })}
            variant="destructive"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
