"use server";

import { protectedProcedure } from "@/server/trpc/trpc";
import { inferProcedureOutput } from "@trpc/server";
import z from "zod";
import { requireProjectMember } from "../board-columns/require-project-member";
import { parseFixedTags } from "./parse-fixed-tags";

export const getDomainRules = protectedProcedure
  .input(z.object({ projectId: z.string() }))
  .query(async ({ input, ctx }) => {
    const { prisma, session } = ctx;
    await requireProjectMember(prisma, input.projectId, session.user.id, {
      admin: false,
    });

    const [rules, membership] = await Promise.all([
      prisma.projectTagExtractor.findMany({
        where: { projectId: input.projectId },
        orderBy: { position: "asc" },
        select: { id: true, pattern: true, fixedTags: true, position: true },
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

    return {
      canEdit: membership !== null,
      rules: rules.map((rule) => ({
        ...rule,
        fixedTags: parseFixedTags(rule.fixedTags),
      })),
    };
  });

export type GetDomainRulesOutput = inferProcedureOutput<typeof getDomainRules>;
