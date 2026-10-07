import {
  TagKeySchema,
  type FeedbackTagsInput,
} from "@/server/domain-rules/feedback-tags.schema";
import type { DomainRuleFormInput } from "./domain-rule-form.schema";

type FixedTagRows = DomainRuleFormInput["fixedTags"];

export function convertFixedTagsToRows(tags: FeedbackTagsInput): FixedTagRows {
  return Object.entries(tags).map(([key, value]) => ({ key, value }));
}

export function convertRowsToFixedTags(rows: FixedTagRows): FeedbackTagsInput {
  return Object.fromEntries(
    rows.map((row) => [row.key.trim(), row.value.trim()]),
  );
}

// The test box previews while the user types, so incomplete rows are skipped
// instead of failing the whole preview.
export function convertRowsToDraftFixedTags(rows: FixedTagRows): FeedbackTagsInput {
  return convertRowsToFixedTags(
    rows.filter(
      (row) =>
        TagKeySchema.safeParse(row.key.trim()).success && row.value.trim(),
    ),
  );
}
