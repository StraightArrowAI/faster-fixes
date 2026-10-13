"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import * as React from "react";
import { toast } from "sonner";
import { CommentBodyForm } from "./comment-body-form.client";
import { describeMove } from "./describe-move";
import type { CommentTransitionInput } from "./feedback-comment.schema";
import { useFeedbackCommentMutations } from "./use-feedback-comment-mutations";

type MoveCommentRequest = {
  id: number;
  feedbackIds: string[];
  transition: CommentTransitionInput;
};

type PromptMoveComment = (request: Omit<MoveCommentRequest, "id">) => void;

const MoveCommentContext = React.createContext<PromptMoveComment | null>(null);

// One dialog shared by the board and the detail panel, so a move from either
// place prompts the same way and a newer move replaces an open prompt instead
// of stacking a second one.
export function MoveCommentProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [request, setRequest] = React.useState<MoveCommentRequest | null>(null);
  const nextId = React.useRef(0);
  const { create, bulkCreate } = useFeedbackCommentMutations();

  const prompt = React.useCallback<PromptMoveComment>((next) => {
    // A column deleted mid-move leaves no name to record; skip the prompt
    // rather than offer a comment the server would reject.
    if (!next.transition.to) return;
    nextId.current += 1;
    setRequest({ ...next, id: nextId.current });
  }, []);

  const close = () => setRequest(null);
  // A newer move may replace the prompt while a submit is in flight; only
  // close the prompt the comment was written for.
  const closeIfCurrent = (id: number) =>
    setRequest((current) => (current?.id === id ? null : current));

  async function handleSubmit(body: string) {
    if (!request) return;
    const { id, feedbackIds, transition } = request;
    if (feedbackIds.length === 1) {
      await create.mutateAsync({
        feedbackId: feedbackIds[0]!,
        body,
        transition,
      });
    } else {
      await bulkCreate.mutateAsync({ feedbackIds, body, transition });
    }
    toast.success(
      feedbackIds.length === 1 ? "Comment added" : "Comments added",
    );
    closeIfCurrent(id);
  }

  return (
    <MoveCommentContext.Provider value={prompt}>
      {children}
      <Dialog
        open={request !== null}
        onOpenChange={(open) => {
          if (!open) close();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add a comment</DialogTitle>
            <DialogDescription>
              {request &&
                describeMove(request.feedbackIds.length, request.transition.to)}
            </DialogDescription>
          </DialogHeader>
          {request && (
            <CommentBodyForm
              key={request.id}
              placeholder="Optional note about this move"
              submitLabel="Add comment"
              autoFocus
              isPending={create.isPending || bulkCreate.isPending}
              secondaryAction={
                <Button type="button" variant="ghost" size="sm" onClick={close}>
                  Skip
                </Button>
              }
              onSubmit={handleSubmit}
            />
          )}
        </DialogContent>
      </Dialog>
    </MoveCommentContext.Provider>
  );
}

// Returns a no-op outside the provider so move controls rendered elsewhere
// keep working without the prompt.
export function usePromptMoveComment(): PromptMoveComment {
  return React.useContext(MoveCommentContext) ?? noop;
}

function noop() {}
