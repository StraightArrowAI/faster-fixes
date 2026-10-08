"use client";

import { EnvironmentBadge } from "@/app/(authenticated)/(project)/_features/environment/environment-badge";
import type { EnvironmentColorsInput } from "@/app/(authenticated)/(project)/_features/environment/environment-color.schema";
import { useTRPC } from "@/lib/trpc/trpc-client";
import { useMutation } from "@tanstack/react-query";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

import { DeleteProjectDomainButton } from "./delete-project-domain-button.client";
import type { GetProjectDomainsOutput } from "./get-project-domains.trpc.query";
import { ProjectDomainDialog } from "./project-domain-dialog.client";
import { useInvalidateProjectDomains } from "./use-invalidate-project-domains";

type ProjectDomain = GetProjectDomainsOutput["domains"][number];

type ProjectDomainRowProps = {
  projectId: string;
  domain: ProjectDomain;
  environmentColors: EnvironmentColorsInput;
  canEdit: boolean;
};

export function ProjectDomainRow({
  projectId,
  domain,
  environmentColors,
  canEdit,
}: ProjectDomainRowProps) {
  const trpc = useTRPC();
  const invalidate = useInvalidateProjectDomains(projectId);

  const makePrimary = useMutation(
    trpc.authenticated.projects.domains.setPrimary.mutationOptions({
      onSuccess: () => {
        invalidate();
        toast.success("Primary domain updated");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <div className="flex items-center gap-2">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-mono text-sm" title={domain.url}>
            {domain.url}
          </span>
          {domain.isPrimary && <Badge variant="outline">Primary</Badge>}
          {domain.environment && (
            <EnvironmentBadge
              environment={domain.environment}
              color={environmentColors[domain.environment]}
            />
          )}
        </div>
        {domain.includeSubdomains && (
          <span className="text-muted-foreground text-xs">
            Includes subdomains
          </span>
        )}
      </div>
      {canEdit && (
        <>
          {!domain.isPrimary && (
            <Button
              variant="ghost"
              size="sm"
              disabled={makePrimary.isPending}
              onClick={() => makePrimary.mutate({ domainId: domain.id })}
            >
              Make primary
            </Button>
          )}
          <ProjectDomainDialog
            projectId={projectId}
            domain={domain}
            trigger={
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Edit ${domain.url}`}
              >
                <Pencil className="size-4" />
              </Button>
            }
          />
          {!domain.isPrimary && (
            <DeleteProjectDomainButton
              projectId={projectId}
              domainId={domain.id}
              url={domain.url}
            />
          )}
        </>
      )}
    </div>
  );
}
