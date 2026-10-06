"use client";

import { useTRPC } from "@/lib/trpc/trpc-client";
import {
  FeedbackColumnCategoryEnum,
  type FeedbackColumnCategory,
} from "@/types/feedback-status";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Plus } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { FEEDBACK_COLUMN_CATEGORY_LABELS } from "./feedback-column-category-labels";
import { useInvalidateFeedbackColumns } from "./use-invalidate-feedback-columns";

type CreateFeedbackColumnFormProps = {
  projectId: string;
};

export function CreateFeedbackColumnForm({
  projectId,
}: CreateFeedbackColumnFormProps) {
  const trpc = useTRPC();
  const invalidate = useInvalidateFeedbackColumns(projectId);
  const [name, setName] = React.useState("");
  const [category, setCategory] =
    React.useState<FeedbackColumnCategory>("in_progress");

  const createColumn = useMutation(
    trpc.authenticated.projects.columns.create.mutationOptions({
      onSuccess: () => {
        invalidate();
        setName("");
        toast.success("Column added");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    createColumn.mutate({ projectId, name, category });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Column name"
        maxLength={40}
        aria-label="Column name"
      />
      <Select
        value={category}
        onValueChange={(v) => setCategory(v as FeedbackColumnCategory)}
      >
        <SelectTrigger className="sm:w-40" aria-label="Status group">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FeedbackColumnCategoryEnum.options.map((c) => (
            <SelectItem key={c} value={c}>
              {FEEDBACK_COLUMN_CATEGORY_LABELS[c]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="submit"
        variant="outline"
        disabled={!name.trim() || createColumn.isPending}
      >
        <Plus className="size-4" />
        Add
      </Button>
    </form>
  );
}
