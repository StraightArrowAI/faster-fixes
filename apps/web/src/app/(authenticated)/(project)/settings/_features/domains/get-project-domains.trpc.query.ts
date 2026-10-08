"use server";

import { protectedProcedure } from "@/server/trpc/trpc";
import type { inferProcedureOutput } from "@trpc/server";
import z from "zod";

import { requireProjectMember } from "../board-columns/require-project-member";

export const getProjectDomains = protectedProcedure
  .input(z.object({ projectId: z.string() }))
  .query(async ({ input, ctx }) => {
    const { prisma, session } = ctx;

    await requireProjectMember(prisma, input.projectId, session.user.id, {
      admin: false,
    });

    const [domains, adminMembership] = await Promise.all([
      prisma.projectDomain.findMany({
        where: { projectId: input.projectId },
        // Primary first, then alphabetical, so every picker reads the same.
        orderBy: [{ isPrimary: "desc" }, { host: "asc" }],
        select: {
          id: true,
          url: true,
          host: true,
          includeSubdomains: true,
          environment: true,
          isPrimary: true,
        },
      }),
      // Returned so the UI can hide edit controls; the mutations enforce it.
      prisma.member.findFirst({
        where: {
          userId: session.user.id,
          role: { in: ["owner", "admin"] },
          organization: { projects: { some: { id: input.projectId } } },
        },
        select: { id: true },
      }),
    ]);

    return { domains, canEdit: adminMembership !== null };
  });

export type GetProjectDomainsOutput = inferProcedureOutput<
  typeof getProjectDomains
>;
