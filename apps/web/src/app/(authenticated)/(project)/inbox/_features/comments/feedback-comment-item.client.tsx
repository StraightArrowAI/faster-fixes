"use client";

import { resolveS3Url } from "@/server/storage/resolve-s3-url";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { format, formatDistanceToNow } from "date-fns";
import { ArrowRight, MoreHorizontal } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { CommentBodyForm } from "./comment-body-form.client";
import type { FeedbackCommentItem as FeedbackComment } from "./get-feedback-comments.trpc.query";
import { useFeedbackCommentMutations } from "./use-feedback-comment-mutations";

type FeedbackCommentItemProps = {
  comment: FeedbackComment;
};

export function FeedbackCommentItem({ comment }: FeedbackCommentItemProps) {
  const { update, remove } = useFeedbackCommentMutations();
  const [isEditing, setIsEditing] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const authorName = comment.author?.name ?? "Former member";
  const createdAt = new Date(comment.createdAt);

  return (
    <li className="flex gap-2.5">
      <Avatar className="mt-0.5 size-6">
        <AvatarImage
          src={
            comment.author?.image
              ? resolveS3Url(comment.author.image)
              : undefined
          }
          className="object-cover"
        />
        <AvatarFallback className="text-[10px]">
          {comment.author?.name?.charAt(0)?.toUpperCase() ?? "?"}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-xs">
          <span className="truncate font-medium">{authorName}</span>
          <time
            dateTime={createdAt.toISOString()}
            title={format(createdAt, "MMM d, yyyy, h:mm a")}
            className="text-muted-foreground shrink-0"
          >
            {formatDistanceToNow(createdAt, { addSuffix: true })}
          </time>
          {comment.editedAt && (
            <span
              className="text-muted-foreground shrink-0"
              title={format(new Date(comment.editedAt), "MMM d, yyyy, h:mm a")}
            >
              · edited
            </span>
          )}

          {(comment.canEdit || comment.canDelete) && !isEditing && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto size-6"
                  aria-label="Comment actions"
                >
                  <MoreHorizontal className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {comment.canEdit && (
                  <DropdownMenuItem onSelect={() => setIsEditing(true)}>
                    Edit
                  </DropdownMenuItem>
                )}
                {comment.canDelete && (
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => setConfirmDelete(true)}
                  >
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {comment.toColumnName && (
          <p className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-1 text-xs">
            Moved
            {comment.fromColumnName && (
              <>
                <span>{comment.fromColumnName}</span>
                <ArrowRight className="size-3" />
              </>
            )}
            {!comment.fromColumnName && <span>to</span>}
            <span>{comment.toColumnName}</span>
          </p>
        )}

        {isEditing ? (
          <div className="mt-1.5">
            <CommentBodyForm
              defaultBody={comment.body}
              submitLabel="Save"
              autoFocus
              isPending={update.isPending}
              secondaryAction={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
              }
              onSubmit={async (body) => {
                await update.mutateAsync({ commentId: comment.id, body });
                setIsEditing(false);
              }}
            />
          </div>
        ) : (
          <p className="mt-1 text-sm leading-relaxed break-words whitespace-pre-wrap">
            {comment.body}
          </p>
        )}
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete comment</AlertDialogTitle>
            <AlertDialogDescription>
              This comment will be permanently removed from the thread.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() =>
                remove.mutate(
                  { commentId: comment.id },
                  { onError: () => toast.error("Failed to delete comment.") },
                )
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}
