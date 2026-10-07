import z from "zod";
import { DomainRuleFieldsSchema } from "./domain-rule-fields.schema";

export const UpdateDomainRuleSchema = z.intersection(
  z.object({ ruleId: z.string() }),
  DomainRuleFieldsSchema,
);

export type UpdateDomainRuleInput = z.infer<typeof UpdateDomainRuleSchema>;
