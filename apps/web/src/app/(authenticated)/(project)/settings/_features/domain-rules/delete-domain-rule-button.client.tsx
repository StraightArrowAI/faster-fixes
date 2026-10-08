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
import { useInvalidateDomainRules } from "./use-invalidate-domain-rules";

type DeleteDomainRuleButtonProps = {
  projectId: string;
  ruleId: string;
  pattern: string;
};

export function DeleteDomainRuleButton({
  projectId,
  ruleId,
  pattern,
}: DeleteDomainRuleButtonProps) {
  const trpc = useTRPC();
  const invalidate = useInvalidateDomainRules(projectId);

  const deleteRule = useMutation(
    trpc.authenticated.projects.tagExtractors.delete.mutationOptions({
      onSuccess: () => {
        invalidate();
        toast.success("Tag extractor deleted");
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
          aria-label={`Delete ${pattern}`}
        >
          <Trash2 className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete tag extractor</AlertDialogTitle>
          <AlertDialogDescription>
            Delete <span className="font-mono font-medium">{pattern}</span>? New
            feedback from matching hosts will no longer get its tags. Existing
            feedback keeps its tags.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deleteRule.mutate({ ruleId })}
            variant="destructive"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
