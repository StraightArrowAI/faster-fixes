import z from "zod";

import { ProjectDomainFieldsSchema } from "./project-domain-fields.schema";

export const CreateProjectDomainSchema = ProjectDomainFieldsSchema.extend({
  projectId: z.string(),
});

export type CreateProjectDomainInput = z.infer<
  typeof CreateProjectDomainSchema
>;
