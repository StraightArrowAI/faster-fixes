import z from "zod";

export const DeleteProjectDomainSchema = z.object({
  domainId: z.string(),
});

export type DeleteProjectDomainInput = z.infer<
  typeof DeleteProjectDomainSchema
>;
