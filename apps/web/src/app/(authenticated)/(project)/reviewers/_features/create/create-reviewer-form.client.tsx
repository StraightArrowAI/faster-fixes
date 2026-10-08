"use client";

import {
  CreateReviewerSchema,
  type CreateReviewerInputs,
  type CreateReviewerOutputInput,
} from "@/app/(authenticated)/(project)/reviewers/_features/create/create-reviewer.schema";
import type { GetProjectDomainsOutput } from "@/app/(authenticated)/(project)/settings/_features/domains/get-project-domains.trpc.query";
import { useTRPC } from "@/lib/trpc/trpc-client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
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
import { Textarea } from "@workspace/ui/components/textarea";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { ReviewerLinkDomainsChecklist } from "../reviewer-link-domains-checklist.client";

type CreateReviewerFormProps = {
  projectId: string;
  domains: GetProjectDomainsOutput["domains"];
  onCreated: (shareUrl: string) => void;
};

export function CreateReviewerForm({
  projectId,
  domains,
  onCreated,
}: CreateReviewerFormProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const primaryIds = domains
    .filter((domain) => domain.isPrimary)
    .map((domain) => domain.id);

  const form = useForm<
    CreateReviewerInputs,
    unknown,
    CreateReviewerOutputInput
  >({
    resolver: zodResolver(CreateReviewerSchema),
    defaultValues: {
      projectId,
      name: "",
      email: "",
      domainIds: primaryIds,
      message: "",
      sendEmail: true,
    },
  });

  const createReviewer = useMutation(
    trpc.authenticated.projects.reviewer.create.mutationOptions({
      onSuccess: (result, variables) => {
        queryClient.invalidateQueries(
          trpc.authenticated.projects.reviewer.list.queryOptions({ projectId }),
        );
        if (variables.sendEmail !== false && !result.emailSent) {
          toast.error(
            "Reviewer created, but the invite email could not be sent. Use Send link to retry.",
          );
        }
        onCreated(result.shareUrl);
      },
      onError: (error) => {
        form.setError("root", { message: error.message });
      },
    }),
  );

  const onSubmit = (data: CreateReviewerOutputInput) => {
    createReviewer.mutate(data);
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        {form.formState.errors.root && (
          <p className="text-destructive text-sm">
            {form.formState.errors.root.message}
          </p>
        )}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Marie - CEO"
                  disabled={createReviewer.isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="marie@example.com"
                  disabled={createReviewer.isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="domainIds"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Domains</FormLabel>
              <ReviewerLinkDomainsChecklist
                id="create-reviewer-domains"
                domains={domains}
                value={field.value}
                onChange={field.onChange}
                disabled={createReviewer.isPending}
              />
              <FormDescription>
                The primary domain is always included.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Message</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Optional note included in the email"
                  rows={3}
                  disabled={createReviewer.isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="sendEmail"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center gap-2">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(checked) =>
                    field.onChange(checked === true)
                  }
                  disabled={createReviewer.isPending}
                />
              </FormControl>
              <FormLabel className="font-normal">Send invite email</FormLabel>
            </FormItem>
          )}
        />
        <Button
          type="submit"
          disabled={createReviewer.isPending}
          className="self-end"
        >
          {createReviewer.isPending ? "Creating..." : "Create"}
        </Button>
      </form>
    </Form>
  );
}
