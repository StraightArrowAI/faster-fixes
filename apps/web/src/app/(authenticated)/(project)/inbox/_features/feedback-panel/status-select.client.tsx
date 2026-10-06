"use client";

import { getBoardColumnId } from "@/app/(authenticated)/(project)/inbox/_features/kanban/get-board-column-id";
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

type StatusSelectProps = {
  feedback: { id: string; status: string; columnId: string | null };
  columns: GetFeedbackColumnsOutput;
};

export function StatusSelect({ feedback, columns }: StatusSelectProps) {
  const { updateStatus, updateColumn } = useFeedbackMutations();

  const value =
    feedback.status === ARCHIVED_VALUE
      ? ARCHIVED_VALUE
      : (getBoardColumnId(feedback, columns) ?? undefined);

  function handleChange(next: string) {
    if (next === ARCHIVED_VALUE) {
      updateStatus(feedback.id, ARCHIVED_VALUE);
    } else {
      updateColumn([feedback.id], next);
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
          <SelectItem value={ARCHIVED_VALUE}>Archived</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
