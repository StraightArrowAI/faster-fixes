"use client";

import { useTRPC } from "@/lib/trpc/trpc-client";
import { matchQueryStatus } from "@/utils/tanstack-query/match-query-status";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import { Separator } from "@workspace/ui/components/separator";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Plus } from "lucide-react";
import { DomainRuleDialog } from "./domain-rule-dialog.client";
import { DomainRuleRow } from "./domain-rule-row.client";
import { EnvironmentColorsList } from "./environment-colors-list.client";

type DomainRulesSectionProps = {
  projectId: string;
};

export function DomainRulesSection({ projectId }: DomainRulesSectionProps) {
  const trpc = useTRPC();
  const rulesQuery = useQuery(
    trpc.authenticated.projects.domainRules.list.queryOptions({ projectId }),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="text-muted-foreground flex flex-col gap-1 text-sm">
        <p>
          Rules are evaluated in order. The first match determines the
          environment.
        </p>
        <p>
          <code className="font-mono">{"{name}"}</code> matches characters
          within one label and saves them as a tag, as in{" "}
          <code className="font-mono">{"app.{env}.example.com"}</code>.{" "}
          <code className="font-mono">*</code> matches the same way without
          saving. Neither matches across a dot.
        </p>
      </div>

      {matchQueryStatus(rulesQuery, {
        Loading: (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ),
        Errored: (
          <p className="text-muted-foreground text-sm">Failed to load rules.</p>
        ),
        Empty: <p className="text-muted-foreground text-sm">No rules.</p>,
        Success: ({ data: { rules, canEdit } }) => (
          <>
            <div className="flex flex-col gap-3">
              {rules.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No rules. Only the main domain and localhost are allowed.
                </p>
              ) : (
                rules.map((rule, index) => (
                  <DomainRuleRow
                    key={rule.id}
                    projectId={projectId}
                    rule={rule}
                    rules={rules}
                    index={index}
                    canEdit={canEdit}
                  />
                ))
              )}
              {canEdit && (
                <DomainRuleDialog
                  projectId={projectId}
                  rules={rules}
                  trigger={
                    <Button variant="outline" className="self-start">
                      <Plus className="size-4" />
                      Add rule
                    </Button>
                  }
                />
              )}
            </div>

            <Separator />

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-medium">Environment colors</h3>
                <p className="text-muted-foreground text-sm">
                  Badge colors for the env tag on board cards.
                </p>
              </div>
              <EnvironmentColorsList
                projectId={projectId}
                rules={rules}
                canEdit={canEdit}
              />
            </div>
          </>
        ),
      })}
    </div>
  );
}
