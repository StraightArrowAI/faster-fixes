"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@workspace/ui/components/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@workspace/ui/components/form";
import { Textarea } from "@workspace/ui/components/textarea";
import { useForm } from "react-hook-form";
import {
  CommentBodyFormSchema,
  type CommentBodyFormInput,
} from "./feedback-comment.schema";

type CommentBodyFormProps = {
  defaultBody?: string;
  placeholder?: string;
  submitLabel: string;
  isPending: boolean;
  autoFocus?: boolean;
  // Rendered left of the submit button: "Cancel" when editing, "Skip" in the
  // move dialog.
  secondaryAction?: React.ReactNode;
  // Resolve to clear the field; throw to keep the text so nothing is lost.
  onSubmit: (body: string) => Promise<unknown>;
};

export function CommentBodyForm({
  defaultBody = "",
  placeholder = "Add a comment",
  submitLabel,
  isPending,
  autoFocus,
  secondaryAction,
  onSubmit,
}: CommentBodyFormProps) {
  const form = useForm<CommentBodyFormInput>({
    resolver: zodResolver(CommentBodyFormSchema),
    defaultValues: { body: defaultBody },
  });

  const submit = form.handleSubmit(async ({ body }) => {
    try {
      await onSubmit(body);
      form.reset({ body: "" });
    } catch (error) {
      form.setError("root", {
        message:
          error instanceof Error ? error.message : "Failed to save comment.",
      });
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={submit} className="flex flex-col gap-2">
        <FormField
          control={form.control}
          name="body"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea
                  placeholder={placeholder}
                  rows={3}
                  autoFocus={autoFocus}
                  disabled={isPending}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      void submit();
                    }
                  }}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {form.formState.errors.root && (
          <p className="text-destructive text-sm">
            {form.formState.errors.root.message}
          </p>
        )}
        <div className="flex justify-end gap-2">
          {secondaryAction}
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? "Saving..." : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
