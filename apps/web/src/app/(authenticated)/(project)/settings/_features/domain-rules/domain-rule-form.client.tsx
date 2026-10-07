"use client";

import type { DomainRuleInput } from "@/server/domain-rules/match-request-host";
import { isOpenSharedHostPattern } from "@/server/domain-rules/shared-hosting-suffixes";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@workspace/ui/components/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";
import { AlertTriangle } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { convertRowsToDraftFixedTags } from "./convert-fixed-tags";
import {
  DomainRuleFormSchema,
  type DomainRuleFormInput,
} from "./domain-rule-form.schema";
import { FixedTagsEditor } from "./fixed-tags-editor.client";
import { HostTestBox } from "./host-test-box.client";

type DomainRuleFormProps = {
  defaultValues: DomainRuleFormInput;
  // Saved rules other than the one being edited, in evaluation order.
  otherRules: DomainRuleInput[];
  draftIndex: number;
  mainDomain: string;
  submitLabel: string;
  isPending: boolean;
  onSubmit: (values: DomainRuleFormInput) => void;
  onCancel: () => void;
};

export function DomainRuleForm({
  defaultValues,
  otherRules,
  draftIndex,
  mainDomain,
  submitLabel,
  isPending,
  onSubmit,
  onCancel,
}: DomainRuleFormProps) {
  const form = useForm<DomainRuleFormInput>({
    resolver: zodResolver(DomainRuleFormSchema),
    defaultValues,
    mode: "onChange",
  });

  const pattern = useWatch({ control: form.control, name: "pattern" });
  const fixedTags = useWatch({ control: form.control, name: "fixedTags" });

  const testRules = [
    ...otherRules.slice(0, draftIndex),
    { pattern, fixedTags: convertRowsToDraftFixedTags(fixedTags) },
    ...otherRules.slice(draftIndex),
  ];

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-6"
      >
        <FormField
          control={form.control}
          name="pattern"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Host pattern</FormLabel>
              <FormControl>
                <Input
                  placeholder="app.{env}.example.com"
                  className="font-mono"
                  autoComplete="off"
                  spellCheck={false}
                  disabled={isPending}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Hostname only, without protocol, port, or path.
              </FormDescription>
              <FormMessage />
              {isOpenSharedHostPattern(pattern) && (
                <p className="text-muted-foreground flex gap-2 text-sm">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  Anyone can deploy a site on this shared hosting domain. Every
                  matching site will be able to submit feedback to this project.
                  Add a fixed prefix to narrow the match.
                </p>
              )}
            </FormItem>
          )}
        />

        <FixedTagsEditor control={form.control} disabled={isPending} />

        <HostTestBox
          rules={testRules}
          draftIndex={draftIndex}
          mainDomain={mainDomain}
        />

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
