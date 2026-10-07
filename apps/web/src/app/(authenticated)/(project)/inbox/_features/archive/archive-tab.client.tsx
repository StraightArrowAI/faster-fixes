"use client";

import { EnvironmentBadge } from "@/app/(authenticated)/(project)/_features/environment/environment-badge";
import { useActiveProject } from "@/app/_features/project/active-project-provider.client";
import { DataTable } from "@/app/_features/core/datatable/data-table";
import { DataTableColumnHeader } from "@/app/_features/core/datatable/data-table-column-header";
import { useTRPC } from "@/lib/trpc/trpc-client";
import { resolveS3Url } from "@/server/storage/resolve-s3-url";
import { matchQueryStatus } from "@/utils/tanstack-query/match-query-status";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { formatDistanceToNow } from "date-fns";
import { AlertCircle } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import type { GetArchivedFeedbackOutput } from "./get-archived-feedback.trpc.query";
import { HardDeleteDialog } from "./hard-delete-dialog.client";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty";
import { Archive } from "lucide-react";

type ArchivedItem = GetArchivedFeedbackOutput["items"][number];

function formatPageUrl(pageUrl: string) {
  try {
    const url = new URL(pageUrl);
    return url.hostname + url.pathname.replace(/\/$/, "");
  } catch {
    return pageUrl;
  }
}

type ArchiveTabProps = {
  envFilter: string | null;
};

export function ArchiveTab({ envFilter }: ArchiveTabProps) {
  const { activeProject } = useActiveProject();
  const projectId = activeProject!.id;
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [page, setPage] = React.useState(1);
  // Reset during render (not in an effect) so the stale page is never fetched.
  const [prevEnvFilter, setPrevEnvFilter] = React.useState(envFilter);
  if (prevEnvFilter !== envFilter) {
    setPrevEnvFilter(envFilter);
    setPage(1);
  }
  const [search, setSearch] = React.useState("");
  const [sorting, setSorting] = React.useState<Array<{ id: string; desc: boolean }>>([]);

  const sortBy = sorting[0]?.id === "createdAt" ? "createdAt" as const : "updatedAt" as const;
  const sortOrder = sorting[0]?.desc === false ? "asc" as const : "desc" as const;

  const archiveQuery = useQuery(
    trpc.authenticated.projects.feedback.listArchived.queryOptions({
      projectId,
      page,
      pageSize: 20,
      search: search || undefined,
      env: envFilter ?? undefined,
      sortBy,
      sortOrder,
    }),
  );

  const hardDeleteMutation = useMutation(
    trpc.authenticated.projects.feedback.hardDelete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.authenticated.projects.feedback.listArchived.queryKey({ projectId }),
        });
        toast.success("Feedback deleted permanently.");
      },
      onError: () => {
        toast.error("Failed to delete feedback.");
      },
    }),
  );

  const bulkHardDeleteMutation = useMutation(
    trpc.authenticated.projects.feedback.bulkHardDelete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.authenticated.projects.feedback.listArchived.queryKey({ projectId }),
        });
        toast.success("Feedback deleted permanently.");
      },
      onError: () => {
        toast.error("Failed to delete feedback.");
      },
    }),
  );

  const environmentColors = archiveQuery.data?.environmentColors;

  const columns: ColumnDef<ArchivedItem>[] = React.useMemo(
    () => [
      {
        accessorKey: "comment",
        header: "Comment",
        cell: ({ row }) => (
          <p className="max-w-[300px] truncate text-sm">{row.original.comment}</p>
        ),
      },
      {
        accessorKey: "pageUrl",
        header: "Page URL",
        cell: ({ row }) => {
          const env = row.original.tags.env;
          return (
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground text-xs">
                {formatPageUrl(row.original.pageUrl)}
              </span>
              {env && (
                <EnvironmentBadge
                  environment={env}
                  color={environmentColors?.[env]}
                  className="block"
                />
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "reviewer",
        header: "Reviewer",
        cell: ({ row }) => (
          <span className="text-sm">{row.original.reviewer.name}</span>
        ),
      },
      {
        accessorKey: "assignee",
        header: "Assignee",
        cell: ({ row }) => {
          const assignee = row.original.assignee;
          if (!assignee) return <span className="text-muted-foreground text-xs">Unassigned</span>;
          return (
            <div className="flex items-center gap-1.5">
              <Avatar className="size-5">
                <AvatarImage
                  src={assignee.image ? resolveS3Url(assignee.image) : undefined}
                  className="object-cover"
                />
                <AvatarFallback className="text-[10px]">
                  {assignee.name?.charAt(0)?.toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">{assignee.name}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "updatedAt",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Closed Date" />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs">
            {formatDistanceToNow(new Date(row.original.updatedAt), { addSuffix: true })}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <HardDeleteDialog
            count={1}
            onConfirm={() => hardDeleteMutation.mutate({ feedbackId: row.original.id })}
            disabled={hardDeleteMutation.isPending}
          />
        ),
      },
    ],
    [hardDeleteMutation, environmentColors],
  );

  return matchQueryStatus(archiveQuery, {
    Loading: (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    ),
    Errored: (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <AlertCircle />
          </EmptyMedia>
          <EmptyTitle>Failed to load archive</EmptyTitle>
          <EmptyDescription>Something went wrong. Please try again later.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    ),
    Empty: (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Archive />
          </EmptyMedia>
          <EmptyTitle>No archived feedback</EmptyTitle>
          <EmptyDescription>
            Feedback items moved to archive will appear here.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    ),
    Success: ({ data }) => (
      <DataTable
        columns={columns}
        data={data.items}
        pageCount={data.pageCount || 1}
        currentPage={page}
        setCurrentPage={setPage}
        search={search}
        setSearch={setSearch}
        searchInputPlaceholder="Search by comment..."
        isLoading={archiveQuery.isFetching}
        onSortingChange={setSorting}
      />
    ),
  });
}
