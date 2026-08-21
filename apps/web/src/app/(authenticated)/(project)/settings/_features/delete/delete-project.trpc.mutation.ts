"use server";

import { deleteFeedbackMedia } from "@/server/storage/delete-feedback-media";
import { protectedProcedure } from "@/server/trpc/trpc";
import { TRPCError, inferProcedureOutput } from "@trpc/server";
import z from "zod";

export const deleteProject = protectedProcedure
  .input(z.object({ projectId: z.string() }))
  .mutation(async ({ input, ctx }) => {
    const { prisma, session } = ctx;

    const project = await prisma.project.findUnique({
      where: { id: input.projectId },
    });

    if (!project) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
    }

    const membership = await prisma.member.findFirst({
      where: {
        organizationId: project.organizationId,
        userId: session.user.id,
        role: { in: ["owner", "admin"] },
      },
    });

    if (!membership) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Access denied." });
    }

    // `Project -> Feedback` is `onDelete: Cascade`, so deleting the project
    // takes every report with it and would orphan all of their media.
    await deleteFeedbackMedia({ projectId: input.projectId });

    await prisma.project.delete({ where: { id: input.projectId } });

    return { id: input.projectId };
  });

export type DeleteProjectOutput = inferProcedureOutput<typeof deleteProject>;
