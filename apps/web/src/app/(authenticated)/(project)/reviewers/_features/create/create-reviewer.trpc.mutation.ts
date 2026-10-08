"use server";

import {
  assertReviewerLinkSendAllowed,
  createReviewerLinkSends,
  getReviewerLinkDomains,
} from "@/server/reviewers/reviewer-link-sends";
import { buildReviewerShareUrl } from "@/server/reviewers/reviewer-share-url";
import { issueReviewerToken } from "@/server/reviewers/reviewer-token";
import { sendReviewerLinksEmail } from "@/server/reviewers/send-reviewer-links-email";
import { protectedProcedure } from "@/server/trpc/trpc";
import { TRPCError, inferProcedureOutput } from "@trpc/server";

import { CreateReviewerSchema } from "./create-reviewer.schema";

export const createReviewer = protectedProcedure
  .input(CreateReviewerSchema)
  .mutation(async ({ input, ctx }) => {
    const { prisma, session } = ctx;

    const project = await prisma.project.findUnique({
      where: { id: input.projectId },
      select: { id: true, name: true, organizationId: true },
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
      select: { id: true },
    });

    if (!membership) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Access denied." });
    }

    const domains = await getReviewerLinkDomains(
      prisma,
      project.id,
      input.domainIds,
    );

    // Before creating, so a rate-limited request leaves no half-created reviewer.
    if (input.sendEmail) {
      await assertReviewerLinkSendAllowed(prisma, project.id);
    }

    const { token, tokenLookup, tokenCiphertext } = issueReviewerToken();

    const reviewer = await prisma.reviewer.create({
      data: {
        projectId: project.id,
        name: input.name,
        email: input.email,
        tokenLookup,
        tokenCiphertext,
      },
    });

    // The reviewer exists at this point, so a failed email is reported in the
    // result rather than thrown: the caller still gets the link to share.
    let emailSent = false;
    if (input.sendEmail) {
      try {
        await sendReviewerLinksEmail({
          projectName: project.name,
          to: input.email,
          token,
          domains,
          message: input.message,
        });
        emailSent = true;
      } catch (error) {
        console.error("Failed to send reviewer invite email:", error);
      }
    }

    if (emailSent) {
      await createReviewerLinkSends(prisma, {
        projectId: project.id,
        reviewerId: reviewer.id,
        domainIds: domains.map((domain) => domain.id),
        sentById: membership.id,
        message: input.message,
      });
    }

    return {
      id: reviewer.id,
      name: reviewer.name,
      shareUrl: buildReviewerShareUrl(domains[0]!.url, token),
      emailSent,
    };
  });

export type CreateReviewerOutput = inferProcedureOutput<typeof createReviewer>;
