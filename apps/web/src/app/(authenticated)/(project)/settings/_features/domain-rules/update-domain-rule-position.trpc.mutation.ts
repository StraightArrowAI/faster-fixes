"use server";

import { protectedProcedure } from "@/server/trpc/trpc";
import { TRPCError, inferProcedureOutput } from "@trpc/server";
import { requireProjectMember } from "../board-columns/require-project-member";
import { DOMAIN_RULES_FORBIDDEN_MESSAGE } from "./domain-rules-forbidden-message";
import { getDomainRuleById } from "./get-domain-rule-by-id";
import { UpdateDomainRulePositionSchema } from "./update-domain-rule-position.schema";

export const updateDomainRulePosition = protectedProcedure
  .input(UpdateDomainRulePositionSchema)
  .mutation(async ({ input, ctx }) => {
    const { prisma, session } = ctx;
    const rule = await getDomainRuleById(prisma, input.ruleId);
    await requireProjectMember(prisma, rule.projectId, session.user.id, {
      admin: true,
      forbiddenMessage: DOMAIN_RULES_FORBIDDEN_MESSAGE,
    });

    const neighbor = await prisma.projectDomainRule.findFirst({
      where: {
        projectId: rule.projectId,
        position:
          input.direction === "up"
            ? { lt: rule.position }
            : { gt: rule.position },
      },
      orderBy: { position: input.direction === "up" ? "desc" : "asc" },
    });

    if (!neighbor) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          input.direction === "up"
            ? "This rule is already first."
            : "This rule is already last.",
      });
    }

    await prisma.$transaction([
      prisma.projectDomainRule.update({
        where: { id: rule.id },
        data: { position: neighbor.position },
      }),
      prisma.projectDomainRule.update({
        where: { id: neighbor.id },
        data: { position: rule.position },
      }),
    ]);

    return { id: rule.id };
  });

export type UpdateDomainRulePositionOutput = inferProcedureOutput<
  typeof updateDomainRulePosition
>;
