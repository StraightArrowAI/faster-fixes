"use server";

import { protectedProcedure } from "@/server/trpc/trpc";
import { inferProcedureOutput } from "@trpc/server";
import { requireProjectMember } from "../board-columns/require-project-member";
import { DOMAIN_RULES_FORBIDDEN_MESSAGE } from "./domain-rules-forbidden-message";
import { UpdateEnvironmentColorsSchema } from "./update-environment-colors.schema";

// Replaces the whole map: environments without an entry use the default badge.
export const updateEnvironmentColors = protectedProcedure
  .input(UpdateEnvironmentColorsSchema)
  .mutation(async ({ input, ctx }) => {
    const { prisma, session } = ctx;
    await requireProjectMember(prisma, input.projectId, session.user.id, {
      admin: true,
      forbiddenMessage: DOMAIN_RULES_FORBIDDEN_MESSAGE,
    });

    await prisma.project.update({
      where: { id: input.projectId },
      data: { environmentColors: input.colors },
    });

    return { id: input.projectId };
  });

export type UpdateEnvironmentColorsOutput = inferProcedureOutput<
  typeof updateEnvironmentColors
>;
