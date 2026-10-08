import z from "zod";

import { ProjectDomainEnvironmentSchema } from "./project-domain-environment.schema";
import { ProjectDomainUrlSchema } from "./project-domain-url.schema";

export const ProjectDomainFieldsSchema = z.object({
  url: ProjectDomainUrlSchema,
  includeSubdomains: z.boolean().default(false),
  environment: ProjectDomainEnvironmentSchema,
});

export type ProjectDomainFieldsInput = z.infer<
  typeof ProjectDomainFieldsSchema
>;
