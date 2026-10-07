import { FeedbackTagsSchema } from "@/server/domain-rules/feedback-tags.schema";
import z from "zod";
import { DomainRulePatternSchema } from "./domain-rule-pattern.schema";
import {
  findFixedTagPlaceholderConflicts,
  formatPlaceholderConflictMessage,
} from "./find-fixed-tag-placeholder-conflicts";

export const DomainRuleFieldsSchema = z
  .object({
    pattern: DomainRulePatternSchema,
    fixedTags: FeedbackTagsSchema,
  })
  .superRefine((value, ctx) => {
    for (const key of findFixedTagPlaceholderConflicts(
      value.pattern,
      Object.keys(value.fixedTags),
    )) {
      ctx.addIssue({
        code: "custom",
        path: ["fixedTags", key],
        message: formatPlaceholderConflictMessage(key),
      });
    }
  });

export type DomainRuleFieldsInput = z.infer<typeof DomainRuleFieldsSchema>;
