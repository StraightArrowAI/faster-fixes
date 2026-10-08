"use server";

import {
  assertReviewerLinkSendAllowed,
  createReviewerLinkSends,
  getReviewerLinkDomains,
} from "@/server/reviewers/reviewer-link-sends";
import {
  decryptReviewerToken,
  issueReviewerToken,
} from "@/server/reviewers/reviewer-token";
import { sendReviewerLinksEmail } from "@/server/reviewers/send-reviewer-links-email";
import { protectedProcedure } from "@/server/trpc/trpc";
import { TRPCError, type inferProcedureOutput } from "@trpc/server";

import { SendReviewerLinksSchema } from "./send-reviewer-links.schema";

export const sendReviewerLinks = protectedProcedure
  .input(SendReviewerLinksSchema)
  .mutation(async ({ input, ctx }) => {
    const { prisma, session } = ctx;

    const reviewer = await prisma.reviewer.findUnique({
      where: { id: input.reviewerId },
      include: {
        project: { select: { id: true, name: true, organizationId: true } },
      },
    });

    if (!reviewer || reviewer.projectId !== input.projectId) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Reviewer not found.",
      });
    }

    const membership = await prisma.member.findFirst({
      where: {
        organizationId: reviewer.project.organizationId,
        userId: session.user.id,
        role: { in: ["owner", "admin"] },
      },
      select: { id: true },
    });

    if (!membership) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Access denied." });
    }

    if (!reviewer.isActive) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Restore this reviewer before sending a link.",
      });
    }

    const domains = await getReviewerLinkDomains(
      prisma,
      reviewer.projectId,
      input.domainIds,
    );

    await assertReviewerLinkSendAllowed(prisma, reviewer.projectId);

    // Legacy reviewers only have a hash, so no link can be rebuilt for them.
    // Issuing a new token invalidates their old link; the dialog warns about it.
    let token: string;
    if (reviewer.tokenCiphertext) {
      token = decryptReviewerToken(reviewer.tokenCiphertext);
      if (reviewer.email !== input.email) {
        await prisma.reviewer.update({
          where: { id: reviewer.id },
          data: { email: input.email },
        });
      }
    } else {
      const issued = issueReviewerToken();
      token = issued.token;
      await prisma.reviewer.update({
        where: { id: reviewer.id },
        data: {
          email: input.email,
          tokenLookup: issued.tokenLookup,
          tokenCiphertext: issued.tokenCiphertext,
        },
      });
    }

    try {
      await sendReviewerLinksEmail({
        projectName: reviewer.project.name,
        to: input.email,
        token,
        domains,
        message: input.message,
      });
    } catch (error) {
      console.error("Failed to send reviewer links email:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "The email could not be sent. Try again later.",
      });
    }

    const sentDomainIds = domains.map((domain) => domain.id);

    await createReviewerLinkSends(prisma, {
      projectId: reviewer.projectId,
      reviewerId: reviewer.id,
      domainIds: sentDomainIds,
      sentById: membership.id,
      message: input.message,
    });

    return { sentDomainIds };
  });

export type SendReviewerLinksOutput = inferProcedureOutput<
  typeof sendReviewerLinks
>;
