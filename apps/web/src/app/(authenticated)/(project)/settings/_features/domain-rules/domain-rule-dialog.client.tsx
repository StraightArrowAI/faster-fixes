"use client";

import { useTRPC } from "@/lib/trpc/trpc-client";
import { matchQueryStatus } from "@/utils/tanstack-query/match-query-status";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Skeleton } from "@workspace/ui/components/skeleton";
import * as React from "react";
import { toast } from "sonner";
import {
  convertFixedTagsToRows,
  convertRowsToFixedTags,
} from "./convert-fixed-tags";
import { DomainRuleForm } from "./domain-rule-form.client";
import type { DomainRuleFormInput } from "./domain-rule-form.schema";
import type { GetDomainRulesOutput } from "./get-domain-rules.trpc.query";
import { useInvalidateDomainRules } from "./use-invalidate-domain-rules";

type DomainRule = GetDomainRulesOutput["rules"][number];

type DomainRuleDialogProps = {
  projectId: string;
  rules: DomainRule[];
  // Omitted when creating a rule.
  rule?: DomainRule;
  trigger: React.ReactNode;
};

export function DomainRuleDialog({
  projectId,
  rules,
  rule,
  trigger,
}: DomainRuleDialogProps) {
  const trpc = useTRPC();
  const invalidate = useInvalidateDomainRules(projectId);
  const [open, setOpen] = React.useState(false);

  // The test box resolves access the way the server does: project domains,
  // plus the legacy main domain for a Project that has no domain rows yet.
  const projectQuery = useQuery(
    trpc.authenticated.projects.get.queryOptions({ projectId }),
  );
  const domainsQuery = useQuery(
    trpc.authenticated.projects.domains.list.queryOptions({ projectId }),
  );

  const mutationCallbacks = {
    onSuccess: () => {
      invalidate();
      setOpen(false);
      toast.success(rule ? "Tag extractor updated" : "Tag extractor added");
    },
    onError: (error: { message: string }) => toast.error(error.message),
  };
  const createRule = useMutation(
    trpc.authenticated.projects.tagExtractors.create.mutationOptions(
      mutationCallbacks,
    ),
  );
  const updateRule = useMutation(
    trpc.authenticated.projects.tagExtractors.update.mutationOptions(
      mutationCallbacks,
    ),
  );

  const otherRules = rules.filter((r) => r.id !== rule?.id);
  const draftIndex = rule
    ? rules.findIndex((r) => r.id === rule.id)
    : otherRules.length;

  const loading = (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );

  function handleSubmit(values: DomainRuleFormInput) {
    const fixedTags = convertRowsToFixedTags(values.fixedTags);
    if (rule) {
      updateRule.mutate({
        ruleId: rule.id,
        pattern: values.pattern,
        fixedTags,
      });
    } else {
      createRule.mutate({ projectId, pattern: values.pattern, fixedTags });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {rule ? "Edit tag extractor" : "Add tag extractor"}
          </DialogTitle>
          <DialogDescription>
            Tag feedback from hosts matching this pattern. Extractors run only
            on hosts a domain already allows.
          </DialogDescription>
        </DialogHeader>
        {matchQueryStatus(projectQuery, {
          Loading: loading,
          Errored: (
            <p className="text-muted-foreground text-sm">
              Failed to load project.
            </p>
          ),
          Empty: (
            <p className="text-muted-foreground text-sm">Project not found.</p>
          ),
          Success: ({ data: project }) =>
            matchQueryStatus(domainsQuery, {
              Loading: loading,
              Errored: (
                <p className="text-muted-foreground text-sm">
                  Failed to load domains.
                </p>
              ),
              Empty: (
                <p className="text-muted-foreground text-sm">
                  Project not found.
                </p>
              ),
              Success: ({ data: { domains } }) => (
                <DomainRuleForm
                  defaultValues={{
                    pattern: rule?.pattern ?? "",
                    fixedTags: convertFixedTagsToRows(rule?.fixedTags ?? {}),
                  }}
                  otherRules={otherRules}
                  draftIndex={draftIndex}
                  domains={domains}
                  fallbackDomain={project.domain}
                  submitLabel={rule ? "Save" : "Add extractor"}
                  isPending={createRule.isPending || updateRule.isPending}
                  onSubmit={handleSubmit}
                  onCancel={() => setOpen(false)}
                />
              ),
            }),
        })}
      </DialogContent>
    </Dialog>
  );
}
