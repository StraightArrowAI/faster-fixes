"use client";

import { useTRPC } from "@/lib/trpc/trpc-client";
import { matchQueryStatus } from "@/utils/tanstack-query/match-query-status";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { CommentBodyForm } from "./comment-body-form.client";
import { FeedbackCommentItem } from "./feedback-comment-item.client";
import { useFeedbackCommentMutations } from "./use-feedback-comment-mutations";

type FeedbackCommentsSectionProps = {
  feedbackId: string;
};

export function FeedbackCommentsSection({
  feedbackId,
}: FeedbackCommentsSectionProps) {
  const trpc = useTRPC();
  const { create } = useFeedbackCommentMutations();

  const commentsQuery = useQuery(
    trpc.authenticated.projects.feedback.comments.list.queryOptions({
      feedbackId,
    }),
  );

  return (
    <div>
      <h4 className="text-muted-foreground mb-2 text-xs font-medium uppercase">
        Comments
      </h4>

      <div className="mb-3">
        {matchQueryStatus(commentsQuery, {
          Loading: (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ),
          Errored: (
            <p className="text-destructive text-sm">Failed to load comments.</p>
          ),
          Empty: (
            <p className="text-muted-foreground text-sm">No comments yet.</p>
          ),
          Success: ({ data: comments }) => (
            <ul className="flex flex-col gap-4">
              {comments.map((comment) => (
                <FeedbackCommentItem key={comment.id} comment={comment} />
              ))}
            </ul>
          ),
        })}
      </div>

      {/* key resets the composer when the panel switches to another card. */}
      <CommentBodyForm
        key={feedbackId}
        submitLabel="Comment"
        isPending={create.isPending}
        onSubmit={(body) => create.mutateAsync({ feedbackId, body })}
      />
    </div>
  );
}
