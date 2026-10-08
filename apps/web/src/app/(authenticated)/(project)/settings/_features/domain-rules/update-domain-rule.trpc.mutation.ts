"use server";

import { protectedProcedure } from "@/server/trpc/trpc";
import { inferProcedureOutput } from "@trpc/server";
import { requireProjectMember } from "../board-columns/require-project-member";
import { DOMAIN_RULES_FORBIDDEN_MESSAGE } from "./domain-rules-forbidden-message";
import { getDomainRuleById } from "./get-domain-rule-by-id";
import { rethrowPatternConflict } from "./rethrow-pattern-conflict";
import { UpdateDomainRuleSchema } from "./update-domain-rule.schema";

export const updateDomainRule = protectedProcedure
  .input(UpdateDomainRuleSchema)
  .mutation(async ({ input, ctx }) => {
    const { prisma, session } = ctx;
    const rule = await getDomainRuleById(prisma, input.ruleId);
    await requireProjectMember(prisma, rule.projectId, session.user.id, {
      admin: true,
      forbiddenMessage: DOMAIN_RULES_FORBIDDEN_MESSAGE,
    });

    try {
      await prisma.projectTagExtractor.update({
        where: { id: rule.id },
        data: { pattern: input.pattern, fixedTags: input.fixedTags },
      });
    } catch (error) {
      rethrowPatternConflict(error);
    }

    return { id: rule.id };
  });

export type UpdateDomainRuleOutput = inferProcedureOutput<
  typeof updateDomainRule
>;
