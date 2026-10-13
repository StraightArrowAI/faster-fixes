"use client";

import { getBoardColumnId } from "@/app/(authenticated)/(project)/inbox/_features/kanban/get-board-column-id";
import { usePromptMoveComment } from "@/app/(authenticated)/(project)/inbox/_features/comments/move-comment-dialog.client";
import { useFeedbackMutations } from "@/app/(authenticated)/(project)/inbox/_features/use-feedback-mutations";
import type { GetFeedbackColumnsOutput } from "@/app/(authenticated)/(project)/settings/_features/board-columns/get-feedback-columns.trpc.query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

// Archive is a status, not a column, so it sits beside the board's columns
// under a value no column id can collide with (column ids are UUIDs).
const ARCHIVED_VALUE = "closed";
const ARCHIVED_LABEL = "Archived";

type StatusSelectProps = {
  feedback: { id: string; status: string; columnId: string | null };
  columns: GetFeedbackColumnsOutput;
};

export function StatusSelect({ feedback, columns }: StatusSelectProps) {
  const { updateStatus, updateColumn } = useFeedbackMutations();
  const promptMoveComment = usePromptMoveComment();

  const value =
    feedback.status === ARCHIVED_VALUE
      ? ARCHIVED_VALUE
      : (getBoardColumnId(feedback, columns) ?? undefined);

  function labelFor(option: string | undefined) {
    if (option === ARCHIVED_VALUE) return ARCHIVED_LABEL;
    return columns.find((c) => c.id === option)?.name ?? null;
  }

  function handleChange(next: string) {
    if (next === value) return;
    const transition = { from: labelFor(value), to: labelFor(next) ?? "" };
    const onSuccess = () =>
      promptMoveComment({ feedbackIds: [feedback.id], transition });

    if (next === ARCHIVED_VALUE) {
      updateStatus(feedback.id, ARCHIVED_VALUE, { onSuccess });
    } else {
      updateColumn([feedback.id], next, { onSuccess });
    }
  }

  return (
    <div>
      <h4 className="text-muted-foreground mb-2 text-xs font-medium uppercase">
        Status
      </h4>
      <Select value={value} onValueChange={handleChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {columns.map((column) => (
            <SelectItem key={column.id} value={column.id}>
              {column.name}
            </SelectItem>
          ))}
          <SelectItem value={ARCHIVED_VALUE}>{ARCHIVED_LABEL}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
