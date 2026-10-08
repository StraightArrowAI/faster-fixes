import z from "zod";

import { ProjectDomainUrlSchema } from "./project-domain-url.schema";

// Form-side shape: environment stays a plain string so the input can be empty;
// the server schema turns "" into null.
export const ProjectDomainFormSchema = z.object({
  url: ProjectDomainUrlSchema,
  includeSubdomains: z.boolean(),
  environment: z
    .string()
    .trim()
    .max(64, "Environment must be 64 characters or fewer."),
});

export type ProjectDomainFormInput = z.infer<typeof ProjectDomainFormSchema>;
