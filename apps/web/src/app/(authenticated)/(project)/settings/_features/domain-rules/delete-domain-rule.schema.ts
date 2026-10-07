import z from "zod";

export const DeleteDomainRuleSchema = z.object({
  ruleId: z.string(),
});

export type DeleteDomainRuleInput = z.infer<typeof DeleteDomainRuleSchema>;
