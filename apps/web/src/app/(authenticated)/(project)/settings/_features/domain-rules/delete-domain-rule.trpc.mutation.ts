"use server";

import { protectedProcedure } from "@/server/trpc/trpc";
import { inferProcedureOutput } from "@trpc/server";
import { requireProjectMember } from "../board-columns/require-project-member";
import { DeleteDomainRuleSchema } from "./delete-domain-rule.schema";
import { DOMAIN_RULES_FORBIDDEN_MESSAGE } from "./domain-rules-forbidden-message";
import { getDomainRuleById } from "./get-domain-rule-by-id";

export const deleteDomainRule = protectedProcedure
  .input(DeleteDomainRuleSchema)
  .mutation(async ({ input, ctx }) => {
    const { prisma, session } = ctx;
    const rule = await getDomainRuleById(prisma, input.ruleId);
    await requireProjectMember(prisma, rule.projectId, session.user.id, {
      admin: true,
      forbiddenMessage: DOMAIN_RULES_FORBIDDEN_MESSAGE,
    });

    // Existing Feedback keeps its tags: they are fixed at submission (ADR-0012).
    await prisma.$transaction([
      prisma.projectTagExtractor.delete({ where: { id: rule.id } }),
      prisma.projectTagExtractor.updateMany({
        where: { projectId: rule.projectId, position: { gt: rule.position } },
        data: { position: { decrement: 1 } },
      }),
    ]);

    return { id: rule.id };
  });

export type DeleteDomainRuleOutput = inferProcedureOutput<
  typeof deleteDomainRule
>;
