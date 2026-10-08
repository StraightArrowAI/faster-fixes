import z from "zod";

export const UpdateProjectPrimaryDomainSchema = z.object({
  domainId: z.string(),
});

export type UpdateProjectPrimaryDomainInput = z.infer<
  typeof UpdateProjectPrimaryDomainSchema
>;
