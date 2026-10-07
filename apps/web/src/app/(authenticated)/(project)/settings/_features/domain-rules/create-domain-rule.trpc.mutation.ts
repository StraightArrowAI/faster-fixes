"use server";

import { protectedProcedure } from "@/server/trpc/trpc";
import { inferProcedureOutput } from "@trpc/server";
import { requireProjectMember } from "../board-columns/require-project-member";
import { CreateDomainRuleSchema } from "./create-domain-rule.schema";
import { DOMAIN_RULES_FORBIDDEN_MESSAGE } from "./domain-rules-forbidden-message";
import { rethrowPatternConflict } from "./rethrow-pattern-conflict";

export const createDomainRule = protectedProcedure
  .input(CreateDomainRuleSchema)
  .mutation(async ({ input, ctx }) => {
    const { prisma, session } = ctx;
    await requireProjectMember(prisma, input.projectId, session.user.id, {
      admin: true,
      forbiddenMessage: DOMAIN_RULES_FORBIDDEN_MESSAGE,
    });

    try {
      return await prisma.$transaction(async (tx) => {
        const last = await tx.projectDomainRule.findFirst({
          where: { projectId: input.projectId },
          orderBy: { position: "desc" },
          select: { position: true },
        });

        return tx.projectDomainRule.create({
          data: {
            projectId: input.projectId,
            pattern: input.pattern,
            fixedTags: input.fixedTags,
            position: (last?.position ?? -1) + 1,
          },
          select: { id: true },
        });
      });
    } catch (error) {
      rethrowPatternConflict(error);
    }
  });

export type CreateDomainRuleOutput = inferProcedureOutput<
  typeof createDomainRule
>;
