"use server";

import { generateApiKey } from "@/app/_features/project/generate-api-key";
import { generatePublicId } from "@/app/_features/project/generate-public-id";
import { protectedProcedure } from "@/server/trpc/trpc";
import { TRPCError, inferProcedureOutput } from "@trpc/server";
import { CreateOnboardingProjectSchema } from "./create-project.schema";
import { DEFAULT_FEEDBACK_COLUMNS } from "@/server/feedback/default-feedback-columns";

export const createOnboardingProject = protectedProcedure
  .input(CreateOnboardingProjectSchema)
  .mutation(async ({ input, ctx }) => {
    const { prisma, session } = ctx;

    const membership = await prisma.member.findFirst({
      where: { userId: session.user.id, role: "owner" },
      select: { organizationId: true },
    });

    if (!membership) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "No organization found.",
      });
    }

    // Handle refresh scenario: project already created during a previous attempt
    const existingProject = await prisma.project.findFirst({
      where: { organizationId: membership.organizationId },
      select: { id: true, name: true, publicId: true },
    });

    if (existingProject) {
      return {
        id: existingProject.id,
        name: existingProject.name,
        publicId: existingProject.publicId,
        rawApiKey: null,
      };
    }

    const { raw, hash, lastFour } = generateApiKey();

    const project = await prisma.project.create({
      data: {
        name: input.name,
        domain: input.domain,
        publicId: generatePublicId(),
        apiKeyHash: hash,
        apiKeyLastFour: lastFour,
        organizationId: membership.organizationId,
        widgetConfig: { create: {} },
        feedbackColumns: { create: DEFAULT_FEEDBACK_COLUMNS },
        // input.domain is already normalized by DomainSchema. Subdomains are
        // included to match the main-domain behavior (ADR-0013).
        domains: {
          create: {
            url: `https://${input.domain}`,
            host: input.domain,
            includeSubdomains: true,
            isPrimary: true,
          },
        },
      },
    });

    return {
      id: project.id,
      name: project.name,
      publicId: project.publicId,
      rawApiKey: raw,
    };
  });

export type CreateOnboardingProjectOutput = inferProcedureOutput<
  typeof createOnboardingProject
>;
