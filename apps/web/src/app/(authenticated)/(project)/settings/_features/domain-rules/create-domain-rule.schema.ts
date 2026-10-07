import z from "zod";
import { DomainRuleFieldsSchema } from "./domain-rule-fields.schema";

export const CreateDomainRuleSchema = z.intersection(
  z.object({ projectId: z.string() }),
  DomainRuleFieldsSchema,
);

export type CreateDomainRuleInput = z.infer<typeof CreateDomainRuleSchema>;
