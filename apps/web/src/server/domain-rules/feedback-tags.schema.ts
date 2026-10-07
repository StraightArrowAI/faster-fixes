import z from "zod";

export const TagKeySchema = z
  .string()
  .regex(
    /^[a-z][a-z0-9_]{0,31}$/,
    "Use lowercase letters, digits, and underscores.",
  );

export const TagValueSchema = z.string().trim().min(1).max(64);

export const FeedbackTagsSchema = z
  .record(TagKeySchema, TagValueSchema)
  .refine((tags) => Object.keys(tags).length <= 10, "At most 10 tags.");

export type FeedbackTags = z.infer<typeof FeedbackTagsSchema>;
