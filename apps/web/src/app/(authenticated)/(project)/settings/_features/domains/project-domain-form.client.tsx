"use client";

import { parseProjectDomainUrl } from "@/server/domain-rules/project-domain-url";
import { SHARED_HOSTING_SUFFIXES } from "@/server/domain-rules/shared-hosting-suffixes";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@workspace/ui/components/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@workspace/ui/components/field";
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
import { Switch } from "@workspace/ui/components/switch";
import { AlertTriangle } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";

import {
  ProjectDomainFormSchema,
  type ProjectDomainFormInput,
} from "./project-domain-form.schema";

type ProjectDomainFormProps = {
  defaultValues: ProjectDomainFormInput;
  submitLabel: string;
  isPending: boolean;
  onSubmit: (values: ProjectDomainFormInput) => void;
  onCancel: () => void;
};

export function ProjectDomainForm({
  defaultValues,
  submitLabel,
  isPending,
  onSubmit,
  onCancel,
}: ProjectDomainFormProps) {
  const form = useForm<ProjectDomainFormInput>({
    resolver: zodResolver(ProjectDomainFormSchema),
    defaultValues,
    mode: "onChange",
  });

  const url = useWatch({ control: form.control, name: "url" });
  const includeSubdomains = useWatch({
    control: form.control,
    name: "includeSubdomains",
  });
  const parsed = parseProjectDomainUrl(url);
  // Subdomains of a shared hosting suffix belong to anyone who deploys there.
  const isOpenSharedHost =
    parsed.ok &&
    includeSubdomains &&
    SHARED_HOSTING_SUFFIXES.some((suffix) => suffix === parsed.host);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-6"
      >
        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL</FormLabel>
              <FormControl>
                <Input
                  placeholder="https://app.example.com"
                  className="font-mono"
                  autoComplete="off"
                  spellCheck={false}
                  disabled={isPending}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                {parsed.ok ? (
                  <>
                    Accepts requests from{" "}
                    <span className="font-mono">{parsed.host}</span>
                    {includeSubdomains && " and its subdomains"}. Reviewer links
                    open <span className="font-mono">{parsed.url}</span>.
                  </>
                ) : (
                  "A path is kept for reviewer links. Query and fragment are dropped."
                )}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="includeSubdomains"
          render={({ field }) => (
            <FormItem>
              <FieldLabel htmlFor="project-domain-include-subdomains">
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldTitle>Include subdomains</FieldTitle>
                    <FieldDescription>
                      Also accept requests from any subdomain of this host.
                    </FieldDescription>
                  </FieldContent>
                  <FormControl>
                    <Switch
                      id="project-domain-include-subdomains"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isPending}
                    />
                  </FormControl>
                </Field>
              </FieldLabel>
              {isOpenSharedHost && (
                <p className="text-muted-foreground flex gap-2 text-sm">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  Anyone can deploy a site on this shared hosting domain. Every
                  such site will be able to submit feedback to this project.
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="environment"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Environment</FormLabel>
              <FormControl>
                <Input
                  placeholder="production"
                  autoComplete="off"
                  disabled={isPending}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Optional. Saved as the env tag on feedback from this domain. Tag
                extractors can override it.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
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
