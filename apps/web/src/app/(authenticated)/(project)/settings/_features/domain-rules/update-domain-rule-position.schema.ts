import z from "zod";

export const UpdateDomainRulePositionSchema = z.object({
  ruleId: z.string(),
  direction: z.enum(["up", "down"]),
});

export type UpdateDomainRulePositionInput = z.infer<
  typeof UpdateDomainRulePositionSchema
>;
