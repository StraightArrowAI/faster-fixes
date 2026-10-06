"use client";

import { useTRPC } from "@/lib/trpc/trpc-client";
import { useMutation } from "@tanstack/react-query";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { ArrowDown, ArrowUp } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { DeleteFeedbackColumnButton } from "./delete-feedback-column-button.client";
import { FEEDBACK_COLUMN_CATEGORY_LABELS } from "./feedback-column-category-labels";
import type { GetFeedbackColumnsOutput } from "./get-feedback-columns.trpc.query";
import { useInvalidateFeedbackColumns } from "./use-invalidate-feedback-columns";

type FeedbackColumnRowProps = {
  projectId: string;
  column: GetFeedbackColumnsOutput[number];
  canMoveUp: boolean;
  canMoveDown: boolean;
  fallbackColumnName: string | null;
};

export function FeedbackColumnRow({
  projectId,
  column,
  canMoveUp,
  canMoveDown,
  fallbackColumnName,
}: FeedbackColumnRowProps) {
  const trpc = useTRPC();
  const invalidate = useInvalidateFeedbackColumns(projectId);
  const [name, setName] = React.useState(column.name);

  React.useEffect(() => setName(column.name), [column.name]);

  const renameColumn = useMutation(
    trpc.authenticated.projects.columns.update.mutationOptions({
      onSuccess: () => invalidate(),
      onError: (error) => {
        setName(column.name);
        toast.error(error.message);
      },
    }),
  );

  const moveColumn = useMutation(
    trpc.authenticated.projects.columns.updatePosition.mutationOptions({
      onSuccess: () => invalidate(),
      onError: (error) => toast.error(error.message),
    }),
  );

  function commitRename() {
    const next = name.trim();
    if (!next || next === column.name) {
      setName(column.name);
      return;
    }
    renameColumn.mutate({ columnId: column.id, name: next });
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={commitRename}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        maxLength={40}
        aria-label={`Rename ${column.name}`}
        className="h-8"
      />
      <Badge variant="secondary" className="shrink-0">
        {FEEDBACK_COLUMN_CATEGORY_LABELS[column.category]}
      </Badge>
      <Button
        variant="ghost"
        size="icon"
        disabled={!canMoveUp || moveColumn.isPending}
        onClick={() =>
          moveColumn.mutate({ columnId: column.id, direction: "up" })
        }
        aria-label={`Move ${column.name} up`}
      >
        <ArrowUp className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        disabled={!canMoveDown || moveColumn.isPending}
        onClick={() =>
          moveColumn.mutate({ columnId: column.id, direction: "down" })
        }
        aria-label={`Move ${column.name} down`}
      >
        <ArrowDown className="size-4" />
      </Button>
      <DeleteFeedbackColumnButton
        projectId={projectId}
        columnId={column.id}
        columnName={column.name}
        fallbackColumnName={fallbackColumnName}
      />
    </div>
  );
}
