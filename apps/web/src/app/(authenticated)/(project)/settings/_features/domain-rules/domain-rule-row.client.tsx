"use client";

import { useTRPC } from "@/lib/trpc/trpc-client";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import { ArrowDown, ArrowUp, Pencil } from "lucide-react";
import { toast } from "sonner";
import { DeleteDomainRuleButton } from "./delete-domain-rule-button.client";
import { DomainRuleDialog } from "./domain-rule-dialog.client";
import { FixedTagChips } from "./fixed-tag-chips";
import type { GetDomainRulesOutput } from "./get-domain-rules.trpc.query";
import { useInvalidateDomainRules } from "./use-invalidate-domain-rules";

type DomainRule = GetDomainRulesOutput["rules"][number];

type DomainRuleRowProps = {
  projectId: string;
  rule: DomainRule;
  rules: DomainRule[];
  index: number;
  canEdit: boolean;
};

export function DomainRuleRow({
  projectId,
  rule,
  rules,
  index,
  canEdit,
}: DomainRuleRowProps) {
  const trpc = useTRPC();
  const invalidate = useInvalidateDomainRules(projectId);

  const moveRule = useMutation(
    trpc.authenticated.projects.domainRules.updatePosition.mutationOptions({
      onSuccess: () => invalidate(),
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground w-5 shrink-0 text-right text-sm tabular-nums">
        {index + 1}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate font-mono text-sm" title={rule.pattern}>
          {rule.pattern}
        </span>
        {Object.keys(rule.fixedTags).length > 0 && (
          <FixedTagChips tags={rule.fixedTags} />
        )}
      </div>
      {canEdit && (
        <>
          <Button
            variant="ghost"
            size="icon"
            disabled={index === 0 || moveRule.isPending}
            onClick={() =>
              moveRule.mutate({ ruleId: rule.id, direction: "up" })
            }
            aria-label={`Move ${rule.pattern} up`}
          >
            <ArrowUp className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            disabled={index === rules.length - 1 || moveRule.isPending}
            onClick={() =>
              moveRule.mutate({ ruleId: rule.id, direction: "down" })
            }
            aria-label={`Move ${rule.pattern} down`}
          >
            <ArrowDown className="size-4" />
          </Button>
          <DomainRuleDialog
            projectId={projectId}
            rules={rules}
            rule={rule}
            trigger={
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Edit ${rule.pattern}`}
              >
                <Pencil className="size-4" />
              </Button>
            }
          />
          <DeleteDomainRuleButton
            projectId={projectId}
            ruleId={rule.id}
            pattern={rule.pattern}
          />
        </>
      )}
    </div>
  );
}
