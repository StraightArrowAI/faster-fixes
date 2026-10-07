import { compileHostPattern } from "@/server/domain-rules/compile-host-pattern";
import { TagKeySchema } from "@/server/domain-rules/feedback-tags.schema";
import z from "zod";
import {
  findFixedTagPlaceholderConflicts,
  formatPlaceholderConflictMessage,
} from "./find-fixed-tag-placeholder-conflicts";

// Form-side shape: tags as ordered rows so the editor can hold blank and
// duplicate entries while typing. Converted to a record on submit; the server
// re-validates with DomainRuleFieldsSchema.
export const DomainRuleFormSchema = z
  .object({
    pattern: z.string().superRefine((value, ctx) => {
      const result = compileHostPattern(value);
      if (!result.ok) ctx.addIssue({ code: "custom", message: result.error });
    }),
    fixedTags: z
      .array(
        z.object({
          key: TagKeySchema,
          value: z
            .string()
            .trim()
            .min(1, "Value is required.")
            .max(64, "Value must be 64 characters or fewer."),
        }),
      )
      .max(10, "At most 10 tags."),
  })
  .superRefine((value, ctx) => {
    const seen = new Set<string>();
    value.fixedTags.forEach((tag, index) => {
      if (seen.has(tag.key)) {
        ctx.addIssue({
          code: "custom",
          path: ["fixedTags", index, "key"],
          message: "Duplicate key.",
        });
      }
      seen.add(tag.key);
    });

    const conflicts = findFixedTagPlaceholderConflicts(
      value.pattern,
      value.fixedTags.map((tag) => tag.key),
    );
    value.fixedTags.forEach((tag, index) => {
      if (conflicts.includes(tag.key)) {
        ctx.addIssue({
          code: "custom",
          path: ["fixedTags", index, "key"],
          message: formatPlaceholderConflictMessage(tag.key),
        });
      }
    });
  });

export type DomainRuleFormInput = z.infer<typeof DomainRuleFormSchema>;
