"use client";

import { useTRPC } from "@/lib/trpc/trpc-client";
import { matchQueryStatus } from "@/utils/tanstack-query/match-query-status";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Plus } from "lucide-react";

import { ProjectDomainDialog } from "./project-domain-dialog.client";
import { ProjectDomainRow } from "./project-domain-row.client";

type ProjectDomainsSectionProps = {
  projectId: string;
};

export function ProjectDomainsSection({
  projectId,
}: ProjectDomainsSectionProps) {
  const trpc = useTRPC();
  const domainsQuery = useQuery(
    trpc.authenticated.projects.domains.list.queryOptions({ projectId }),
  );
  // Only for badge colors; rows render with default colors until it loads.
  const projectQuery = useQuery(
    trpc.authenticated.projects.get.queryOptions({ projectId }),
  );
  const environmentColors = projectQuery.data?.environmentColors ?? {};

  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted-foreground text-sm">
        The widget accepts requests only from these domains and localhost. The
        primary domain is the default link for reviewers.
      </p>

      {matchQueryStatus(domainsQuery, {
        Loading: (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ),
        Errored: (
          <p className="text-muted-foreground text-sm">
            Failed to load domains.
          </p>
        ),
        Empty: <p className="text-muted-foreground text-sm">No domains.</p>,
        Success: ({ data: { domains, canEdit } }) => (
          <div className="flex flex-col gap-3">
            {domains.length === 0 ? (
              <p className="text-muted-foreground text-sm">No domains.</p>
            ) : (
              domains.map((domain) => (
                <ProjectDomainRow
                  key={domain.id}
                  projectId={projectId}
                  domain={domain}
                  environmentColors={environmentColors}
                  canEdit={canEdit}
                />
              ))
            )}
            {canEdit && (
              <ProjectDomainDialog
                projectId={projectId}
                trigger={
                  <Button variant="outline" className="self-start">
                    <Plus className="size-4" />
                    Add domain
                  </Button>
                }
              />
            )}
          </div>
        ),
      })}
    </div>
  );
}
