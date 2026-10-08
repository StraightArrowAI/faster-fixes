"use server";

import { protectedProcedure } from "@/server/trpc/trpc";
import { inferProcedureOutput } from "@trpc/server";

import { requireProjectMember } from "../board-columns/require-project-member";
import { CreateProjectDomainSchema } from "./create-project-domain.schema";
import { parseProjectDomainUrlOrThrow } from "./parse-project-domain-url-or-throw";
import { PROJECT_DOMAINS_FORBIDDEN_MESSAGE } from "./project-domains-forbidden-message";
import { rethrowDomainConflict } from "./rethrow-domain-conflict";

export const createProjectDomain = protectedProcedure
  .input(CreateProjectDomainSchema)
  .mutation(async ({ input, ctx }) => {
    const { prisma, session } = ctx;
    await requireProjectMember(prisma, input.projectId, session.user.id, {
      admin: true,
      forbiddenMessage: PROJECT_DOMAINS_FORBIDDEN_MESSAGE,
    });

    const { url, host } = parseProjectDomainUrlOrThrow(input.url);

    try {
      return await prisma.$transaction(async (tx) => {
        // A Project created by the previous deploy during the build window has
        // no rows and is still matched by its legacy domain. Adding a first
        // alternative would end that fallback, so the primary is backfilled
        // the same way the migration did.
        const existing = await tx.projectDomain.count({
          where: { projectId: input.projectId },
        });
        if (existing === 0) {
          const project = await tx.project.findUniqueOrThrow({
            where: { id: input.projectId },
            select: { domain: true },
          });
          await tx.projectDomain.create({
            data: {
              projectId: input.projectId,
              url: `https://${project.domain}`,
              host: project.domain,
              includeSubdomains: true,
              isPrimary: true,
            },
          });
        }

        // New entries are never primary; "Make primary" is the only way to
        // move it, so Project.domain changes in exactly one place.
        return tx.projectDomain.create({
          data: {
            projectId: input.projectId,
            url,
            host,
            includeSubdomains: input.includeSubdomains,
            environment: input.environment,
            isPrimary: false,
          },
          select: { id: true },
        });
      });
    } catch (error) {
      rethrowDomainConflict(error);
    }
  });

export type CreateProjectDomainOutput = inferProcedureOutput<
  typeof createProjectDomain
>;
