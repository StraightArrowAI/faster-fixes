"use client";

import { useTRPC } from "@/lib/trpc/trpc-client";
import { matchQueryStatus } from "@/utils/tanstack-query/match-query-status";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { CreateFeedbackColumnForm } from "./create-feedback-column-form.client";
import { FeedbackColumnRow } from "./feedback-column-row.client";
import type { GetFeedbackColumnsOutput } from "./get-feedback-columns.trpc.query";

type BoardColumnsSectionProps = {
  projectId: string;
};

// Where a deleted column's cards land: the first other column in its group,
// matching the server's null-columnId rule.
function getFallbackColumnName(
  columns: GetFeedbackColumnsOutput,
  column: GetFeedbackColumnsOutput[number],
) {
  return (
    columns.find((c) => c.category === column.category && c.id !== column.id)
      ?.name ?? null
  );
}

export function BoardColumnsSection({ projectId }: BoardColumnsSectionProps) {
  const trpc = useTRPC();
  const columnsQuery = useQuery(
    trpc.authenticated.projects.columns.list.queryOptions({ projectId }),
  );

  return (
    <div className="flex flex-col gap-4">
      {matchQueryStatus(columnsQuery, {
        Loading: (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ),
        Errored: (
          <p className="text-muted-foreground text-sm">
            Failed to load columns.
          </p>
        ),
        Empty: <p className="text-muted-foreground text-sm">No columns.</p>,
        Success: ({ data: columns }) => (
          <div className="flex flex-col gap-2">
            {columns.map((column, i) => (
              <FeedbackColumnRow
                key={column.id}
                projectId={projectId}
                column={column}
                canMoveUp={columns[i - 1]?.category === column.category}
                canMoveDown={columns[i + 1]?.category === column.category}
                fallbackColumnName={getFallbackColumnName(columns, column)}
              />
            ))}
          </div>
        ),
      })}
      <CreateFeedbackColumnForm projectId={projectId} />
    </div>
  );
}
