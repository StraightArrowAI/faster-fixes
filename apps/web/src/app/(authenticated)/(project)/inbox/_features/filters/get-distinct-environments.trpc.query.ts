"use server";

import { protectedProcedure } from "@/server/trpc/trpc";
import type { inferProcedureOutput } from "@trpc/server";
import z from "zod";

import { requireProjectMember } from "../../../settings/_features/board-columns/require-project-member";

export const getDistinctEnvironments = protectedProcedure
  .input(z.object({ projectId: z.string() }))
  .query(async ({ input, ctx }) => {
    const { prisma, session } = ctx;

    await requireProjectMember(prisma, input.projectId, session.user.id, {
      admin: false,
    });

    // Prisma's `distinct` can't target a JSON path, so read the env key directly.
    const rows = await prisma.$queryRaw<{ env: string }[]>`
      SELECT DISTINCT "tags"->>'env' AS "env"
      FROM "feedback"
      WHERE "projectId" = ${input.projectId} AND "tags" ? 'env'
      ORDER BY 1
    `;

    return rows.map((r) => r.env);
  });

export type GetDistinctEnvironmentsOutput = inferProcedureOutput<
  typeof getDistinctEnvironments
>;
