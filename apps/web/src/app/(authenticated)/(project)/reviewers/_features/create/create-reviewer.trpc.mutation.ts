"use server";

import { resolveRequestOrigin } from "@/server/api/resolve-request-origin";
import {
  buildReviewerShareUrl,
  parseReviewerLinkUrl,
} from "@/server/reviewers/reviewer-share-url";
import { protectedProcedure } from "@/server/trpc/trpc";
import { TRPCError, inferProcedureOutput } from "@trpc/server";
import crypto from "crypto";
import { CreateReviewerSchema } from "./create-reviewer.schema";

export const createReviewer = protectedProcedure
  .input(CreateReviewerSchema)
  .mutation(async ({ input, ctx }) => {
    const { prisma, session } = ctx;

    const project = await prisma.project.findUnique({
      where: { id: input.projectId },
      include: {
        domainRules: {
          orderBy: { position: "asc" },
          select: { pattern: true, fixedTags: true },
        },
      },
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

    let linkUrl: string | null = null;
    if (input.linkUrl) {
      const parsed = parseReviewerLinkUrl(input.linkUrl);
      if (!parsed.ok) {
        throw new TRPCError({ code: "BAD_REQUEST", message: parsed.error });
      }
      // Same check the widget's requests face, so a link we hand out can
      // never land on a page where the token is refused.
      const origin = resolveRequestOrigin(
        new Headers({ origin: new URL(parsed.url).origin }),
        project,
      );
      if (!origin.allowed) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `${parsed.host} is not allowed for this project. Use the main domain or add a domain rule in settings.`,
        });
      }
      linkUrl = parsed.url;
    }

    const token = crypto.randomBytes(24).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const reviewer = await prisma.reviewer.create({
      data: {
        projectId: input.projectId,
        name: input.name,
        token: tokenHash,
        linkUrl,
      },
    });

    // Return raw token once — only the hash is persisted
    return {
      id: reviewer.id,
      name: reviewer.name,
      token,
      shareUrl: buildReviewerShareUrl(linkUrl, project.domain, token),
    };
  });

export type CreateReviewerOutput = inferProcedureOutput<typeof createReviewer>;
