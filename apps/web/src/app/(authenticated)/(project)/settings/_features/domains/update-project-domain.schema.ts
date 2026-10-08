import z from "zod";

import { ProjectDomainFieldsSchema } from "./project-domain-fields.schema";

export const UpdateProjectDomainSchema = ProjectDomainFieldsSchema.extend({
  domainId: z.string(),
});

export type UpdateProjectDomainInput = z.infer<
  typeof UpdateProjectDomainSchema
>;
