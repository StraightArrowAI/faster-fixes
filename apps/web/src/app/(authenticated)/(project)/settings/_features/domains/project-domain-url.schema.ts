import { parseProjectDomainUrl } from "@/server/domain-rules/project-domain-url";
import z from "zod";

// Validation only: the mutations re-run parseProjectDomainUrl to get the
// normalized url and host, so the form and the server accept the same input.
export const ProjectDomainUrlSchema = z.string().superRefine((value, ctx) => {
  const result = parseProjectDomainUrl(value);
  if (!result.ok) ctx.addIssue({ code: "custom", message: result.error });
});

export type ProjectDomainUrlInput = z.infer<typeof ProjectDomainUrlSchema>;
