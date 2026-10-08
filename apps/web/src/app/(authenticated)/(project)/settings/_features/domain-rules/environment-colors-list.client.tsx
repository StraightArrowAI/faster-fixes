"use client";

import type { EnvironmentColorInput } from "@/app/(authenticated)/(project)/_features/environment/environment-color.schema";
import { useTRPC } from "@/lib/trpc/trpc-client";
import { matchQueryStatus } from "@/utils/tanstack-query/match-query-status";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { toast } from "sonner";
import { EnvironmentColorRow } from "./environment-color-row.client";
import type { GetDomainRulesOutput } from "./get-domain-rules.trpc.query";

type EnvironmentColorsListProps = {
  projectId: string;
  rules: GetDomainRulesOutput["rules"];
  canEdit: boolean;
};

export function EnvironmentColorsList({
  projectId,
  rules,
  canEdit,
}: EnvironmentColorsListProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const environmentsQuery = useQuery(
    trpc.authenticated.projects.feedback.distinctEnvironments.queryOptions({
      projectId,
    }),
  );
  const projectQuery = useQuery(
    trpc.authenticated.projects.get.queryOptions({ projectId }),
  );
  const domainsQuery = useQuery(
    trpc.authenticated.projects.domains.list.queryOptions({ projectId }),
  );
  const colors = projectQuery.data?.environmentColors ?? {};

  const updateColors = useMutation(
    trpc.authenticated.projects.updateEnvironmentColors.mutationOptions({
      onSuccess: () =>
        queryClient.invalidateQueries({
          queryKey: trpc.authenticated.projects.get.queryKey({ projectId }),
        }),
      onError: (error) => toast.error(error.message),
    }),
  );

  function handleColorChange(
    environment: string,
    color: EnvironmentColorInput | undefined,
  ) {
    const next = { ...colors };
    if (color) next[environment] = color;
    else delete next[environment];
    updateColors.mutate({ projectId, colors: next });
  }

  return matchQueryStatus(environmentsQuery, {
    Loading: (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    ),
    Errored: (
      <p className="text-muted-foreground text-sm">
        Failed to load environments.
      </p>
    ),
    Success: ({ data: feedbackEnvironments }) => {
      // Configured envs are included so a color can be set before any
      // feedback arrives. Captured {env} values only appear once used.
      const environments = [
        ...new Set([
          ...(feedbackEnvironments ?? []),
          ...rules.flatMap((rule) =>
            rule.fixedTags.env ? [rule.fixedTags.env] : [],
          ),
          ...(domainsQuery.data?.domains ?? []).flatMap((domain) =>
            domain.environment ? [domain.environment] : [],
          ),
        ]),
      ].sort((a, b) => a.localeCompare(b));

      if (environments.length === 0) {
        return (
          <p className="text-muted-foreground text-sm">
            No environments yet. They appear once a domain, a tag extractor, or
            feedback sets an env tag.
          </p>
        );
      }

      return (
        <div className="flex flex-col gap-2">
          {environments.map((environment) => (
            <EnvironmentColorRow
              key={environment}
              environment={environment}
              color={colors[environment]}
              canEdit={canEdit}
              disabled={updateColors.isPending || !projectQuery.data}
              onColorChange={(color) => handleColorChange(environment, color)}
            />
          ))}
        </div>
      );
    },
  });
}
