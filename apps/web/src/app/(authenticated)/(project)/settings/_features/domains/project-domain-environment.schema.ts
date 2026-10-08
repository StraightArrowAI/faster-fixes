import { TagValueSchema } from "@/server/domain-rules/feedback-tags.schema";
import z from "zod";

// The form sends "" for "no environment"; that is stored as null rather than
// rejected by the tag value rules.
export const ProjectDomainEnvironmentSchema = z
  .string()
  .optional()
  .transform((value) => value?.trim() || null)
  .pipe(TagValueSchema.nullable());

export type ProjectDomainEnvironmentInput = z.infer<
  typeof ProjectDomainEnvironmentSchema
>;
