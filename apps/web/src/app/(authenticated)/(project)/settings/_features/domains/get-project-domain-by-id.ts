import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@workspace/db/generated/prisma/client";

export async function getProjectDomainById(
  prisma: PrismaClient,
  domainId: string,
) {
  const domain = await prisma.projectDomain.findUnique({
    where: { id: domainId },
  });

  if (!domain) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Domain not found." });
  }

  return domain;
}
