import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@workspace/db/generated/prisma/client";

export async function getDomainRuleById(prisma: PrismaClient, ruleId: string) {
  const rule = await prisma.projectDomainRule.findUnique({
    where: { id: ruleId },
  });

  if (!rule) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Rule not found." });
  }

  return rule;
}
