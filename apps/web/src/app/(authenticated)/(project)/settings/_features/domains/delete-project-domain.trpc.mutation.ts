"use server";

import { protectedProcedure } from "@/server/trpc/trpc";
import { TRPCError, inferProcedureOutput } from "@trpc/server";

import { requireProjectMember } from "../board-columns/require-project-member";
import { DeleteProjectDomainSchema } from "./delete-project-domain.schema";
import { getProjectDomainById } from "./get-project-domain-by-id";
import { PROJECT_DOMAINS_FORBIDDEN_MESSAGE } from "./project-domains-forbidden-message";

export const deleteProjectDomain = protectedProcedure
  .input(DeleteProjectDomainSchema)
  .mutation(async ({ input, ctx }) => {
    const { prisma, session } = ctx;
    const domain = await getProjectDomainById(prisma, input.domainId);
    await requireProjectMember(prisma, domain.projectId, session.user.id, {
      admin: true,
      forbiddenMessage: PROJECT_DOMAINS_FORBIDDEN_MESSAGE,
    });

    // isPrimary is part of the delete's filter so a concurrent "Make primary"
    // cannot leave the Project without one. Reviewer link sends for this
    // domain cascade; existing Feedback keeps its tags.
    const { count } = await prisma.projectDomain.deleteMany({
      where: { id: domain.id, isPrimary: false },
    });

    if (count === 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "The primary domain cannot be deleted. Make another domain primary first.",
      });
    }

    return { id: domain.id };
  });

export type DeleteProjectDomainOutput = inferProcedureOutput<
  typeof deleteProjectDomain
>;
