import { compileHostPattern } from "@/server/domain-rules/compile-host-pattern";
import z from "zod";

// Validation lives in compileHostPattern so settings and the request path
// accept exactly the same patterns; the output is the normalized source.
export const DomainRulePatternSchema = z.string().transform((value, ctx) => {
  const result = compileHostPattern(value);
  if (!result.ok) {
    ctx.addIssue({ code: "custom", message: result.error });
    return z.NEVER;
  }
  return result.pattern.source;
});

export type DomainRulePatternInput = z.infer<typeof DomainRulePatternSchema>;
