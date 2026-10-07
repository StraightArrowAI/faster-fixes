import z from "zod";

const MAX_TAGS = 10;

export const TagKeySchema = z
  .string()
  .regex(
    /^[a-z][a-z0-9_]{0,31}$/,
    "Use lowercase letters, digits, and underscores.",
  );

export const TagValueSchema = z.string().trim().min(1).max(64);

export const FeedbackTagsSchema = z
  .record(TagKeySchema, TagValueSchema)
  .refine((tags) => Object.keys(tags).length <= MAX_TAGS, "At most 10 tags.");

export type FeedbackTagsInput = z.infer<typeof FeedbackTagsSchema>;

// App-supplied tags are best effort: an empty env var or a bad key must not
// cost the Reviewer their report, so invalid entries are dropped, not rejected.
export function sanitizeAppTags(value: unknown): FeedbackTagsInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const tags: FeedbackTagsInput = {};
  for (const [key, raw] of Object.entries(value)) {
    if (Object.keys(tags).length >= MAX_TAGS) break;
    const k = TagKeySchema.safeParse(key);
    const v = TagValueSchema.safeParse(raw);
    if (k.success && v.success) tags[k.data] = v.data;
  }
  return tags;
}
