"use client";

import type {
  ProjectDomainInput,
  TagExtractorInput,
} from "@/server/domain-rules/match-request-host";
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
  // Saved extractors other than the one being edited, in evaluation order.
  otherRules: TagExtractorInput[];
  draftIndex: number;
  domains: (ProjectDomainInput & { url: string })[];
  fallbackDomain: string;
  submitLabel: string;
  isPending: boolean;
  onSubmit: (values: DomainRuleFormInput) => void;
  onCancel: () => void;
};

export function DomainRuleForm({
  defaultValues,
  otherRules,
  draftIndex,
  domains,
  fallbackDomain,
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
            </FormItem>
          )}
        />

        <FixedTagsEditor control={form.control} disabled={isPending} />

        <HostTestBox
          domains={domains}
          extractors={testRules}
          draftIndex={draftIndex}
          fallbackDomain={fallbackDomain}
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
