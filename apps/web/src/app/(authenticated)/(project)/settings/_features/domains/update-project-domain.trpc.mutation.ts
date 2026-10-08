"use server";

import { protectedProcedure } from "@/server/trpc/trpc";
import { inferProcedureOutput } from "@trpc/server";

import { requireProjectMember } from "../board-columns/require-project-member";
import { getProjectDomainById } from "./get-project-domain-by-id";
import { parseProjectDomainUrlOrThrow } from "./parse-project-domain-url-or-throw";
import { PROJECT_DOMAINS_FORBIDDEN_MESSAGE } from "./project-domains-forbidden-message";
import { rethrowDomainConflict } from "./rethrow-domain-conflict";
import { UpdateProjectDomainSchema } from "./update-project-domain.schema";

export const updateProjectDomain = protectedProcedure
  .input(UpdateProjectDomainSchema)
  .mutation(async ({ input, ctx }) => {
    const { prisma, session } = ctx;
    const domain = await getProjectDomainById(prisma, input.domainId);
    await requireProjectMember(prisma, domain.projectId, session.user.id, {
      admin: true,
      forbiddenMessage: PROJECT_DOMAINS_FORBIDDEN_MESSAGE,
    });

    const { url, host } = parseProjectDomainUrlOrThrow(input.url);

    try {
      await prisma.$transaction([
        prisma.projectDomain.update({
          where: { id: domain.id },
          data: {
            url,
            host,
            includeSubdomains: input.includeSubdomains,
            environment: input.environment,
          },
        }),
        // Project.domain mirrors the primary's host for the previously
        // deployed code until a contract deploy drops it (ADR-0013).
        ...(domain.isPrimary
          ? [
              prisma.project.update({
                where: { id: domain.projectId },
                data: { domain: host },
              }),
            ]
          : []),
      ]);
    } catch (error) {
      rethrowDomainConflict(error);
    }

    return { id: domain.id };
  });

export type UpdateProjectDomainOutput = inferProcedureOutput<
  typeof updateProjectDomain
>;
