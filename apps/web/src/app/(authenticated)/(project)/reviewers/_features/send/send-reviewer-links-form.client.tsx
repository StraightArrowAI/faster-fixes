"use client";

import type { GetProjectDomainsOutput } from "@/app/(authenticated)/(project)/settings/_features/domains/get-project-domains.trpc.query";
import { useTRPC } from "@/lib/trpc/trpc-client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Textarea } from "@workspace/ui/components/textarea";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import type { GetReviewersOutput } from "../get-reviewers.trpc.query";
import { ReviewerLinkDomainsChecklist } from "../reviewer-link-domains-checklist.client";
import {
  SendReviewerLinksSchema,
  type SendReviewerLinksInput,
} from "./send-reviewer-links.schema";

type SendReviewerLinksFormProps = {
  projectId: string;
  reviewer: GetReviewersOutput[number];
  domains: GetProjectDomainsOutput["domains"];
  onSent: () => void;
};

export function SendReviewerLinksForm({
  projectId,
  reviewer,
  domains,
  onSent,
}: SendReviewerLinksFormProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const form = useForm<SendReviewerLinksInput>({
    resolver: zodResolver(SendReviewerLinksSchema),
    defaultValues: {
      projectId,
      reviewerId: reviewer.id,
      email: reviewer.email ?? "",
      domainIds: domains
        .filter((domain) => domain.isPrimary)
        .map((domain) => domain.id),
      message: "",
    },
  });

  const sendLinks = useMutation(
    trpc.authenticated.projects.reviewer.sendLinks.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(
          trpc.authenticated.projects.reviewer.list.queryOptions({ projectId }),
        );
        toast.success(`Link sent to ${reviewer.name}`);
        onSent();
      },
      onError: (error) => {
        form.setError("root", { message: error.message });
      },
    }),
  );

  const onSubmit = (data: SendReviewerLinksInput) => {
    sendLinks.mutate(data);
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
        {reviewer.isLegacyToken && (
          <p className="text-muted-foreground bg-muted rounded-md p-3 text-sm">
            This reviewer has an older link that cannot be resent. Sending
            issues a new link, and the previous one stops working.
          </p>
        )}
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
                  disabled={sendLinks.isPending}
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
                id={`send-reviewer-links-${reviewer.id}`}
                domains={domains}
                value={field.value}
                onChange={field.onChange}
                disabled={sendLinks.isPending}
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
                  disabled={sendLinks.isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          disabled={sendLinks.isPending}
          className="self-end"
        >
          {sendLinks.isPending ? "Sending..." : "Send"}
        </Button>
      </form>
    </Form>
  );
}
