"use server";

import { protectedProcedure } from "@/server/trpc/trpc";
import { inferProcedureOutput } from "@trpc/server";

import { requireProjectMember } from "../board-columns/require-project-member";
import { getProjectDomainById } from "./get-project-domain-by-id";
import { PROJECT_DOMAINS_FORBIDDEN_MESSAGE } from "./project-domains-forbidden-message";
import { UpdateProjectPrimaryDomainSchema } from "./update-project-primary-domain.schema";

export const updateProjectPrimaryDomain = protectedProcedure
  .input(UpdateProjectPrimaryDomainSchema)
  .mutation(async ({ input, ctx }) => {
    const { prisma, session } = ctx;
    const domain = await getProjectDomainById(prisma, input.domainId);
    await requireProjectMember(prisma, domain.projectId, session.user.id, {
      admin: true,
      forbiddenMessage: PROJECT_DOMAINS_FORBIDDEN_MESSAGE,
    });

    // One transaction so there is never zero or two primaries, and
    // Project.domain (read by the previous deploy) moves with it.
    await prisma.$transaction([
      prisma.projectDomain.updateMany({
        where: {
          projectId: domain.projectId,
          isPrimary: true,
          id: { not: domain.id },
        },
        data: { isPrimary: false },
      }),
      prisma.projectDomain.update({
        where: { id: domain.id },
        data: { isPrimary: true },
      }),
      prisma.project.update({
        where: { id: domain.projectId },
        data: { domain: domain.host },
      }),
    ]);

    return { id: domain.id };
  });

export type UpdateProjectPrimaryDomainOutput = inferProcedureOutput<
  typeof updateProjectPrimaryDomain
>;
