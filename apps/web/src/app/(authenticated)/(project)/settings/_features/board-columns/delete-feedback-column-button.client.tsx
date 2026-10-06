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
import { useInvalidateFeedbackColumns } from "./use-invalidate-feedback-columns";

type DeleteFeedbackColumnButtonProps = {
  projectId: string;
  columnId: string;
  columnName: string;
  fallbackColumnName: string | null;
};

export function DeleteFeedbackColumnButton({
  projectId,
  columnId,
  columnName,
  fallbackColumnName,
}: DeleteFeedbackColumnButtonProps) {
  const trpc = useTRPC();
  const invalidate = useInvalidateFeedbackColumns(projectId);

  const deleteColumn = useMutation(
    trpc.authenticated.projects.columns.delete.mutationOptions({
      onSuccess: () => {
        invalidate();
        toast.success("Column deleted");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  // The last column in a status group can't go: its cards would have nowhere
  // to land.
  if (!fallbackColumnName) {
    return (
      <Button
        variant="ghost"
        size="icon"
        disabled
        aria-label={`Delete ${columnName}`}
        title="Each status group needs at least one column"
      >
        <Trash2 className="size-4" />
      </Button>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive"
          aria-label={`Delete ${columnName}`}
        >
          <Trash2 className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete column</AlertDialogTitle>
          <AlertDialogDescription>
            Delete <span className="font-medium">{columnName}</span>? Any
            feedback in it moves to{" "}
            <span className="font-medium">{fallbackColumnName}</span>. Its
            status does not change.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deleteColumn.mutate({ columnId })}
            variant="destructive"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
