"use server";

import { buildReviewerShareUrl } from "@/server/reviewers/reviewer-share-url";
import { decryptReviewerToken } from "@/server/reviewers/reviewer-token";
import { protectedProcedure } from "@/server/trpc/trpc";
import { inferProcedureOutput, TRPCError } from "@trpc/server";
import z from "zod";

export const getReviewers = protectedProcedure
  .input(z.object({ projectId: z.string() }))
  .query(async ({ input, ctx }) => {
    const { prisma, session } = ctx;

    const project = await prisma.project.findUnique({
      where: { id: input.projectId },
      select: { organizationId: true },
    });

    if (!project) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
    }

    const membership = await prisma.member.findFirst({
      where: {
        organizationId: project.organizationId,
        userId: session.user.id,
      },
      select: { role: true },
    });

    if (!membership) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Access denied." });
    }

    const [reviewers, domains, latestSends] = await Promise.all([
      prisma.reviewer.findMany({
        where: { projectId: input.projectId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true,
          createdAt: true,
          tokenCiphertext: true,
          _count: { select: { feedback: true } },
        },
      }),
      prisma.projectDomain.findMany({
        where: { projectId: input.projectId },
        orderBy: [{ isPrimary: "desc" }, { host: "asc" }],
        select: { id: true, url: true, host: true },
      }),
      prisma.reviewerLinkSend.groupBy({
        by: ["reviewerId", "projectDomainId"],
        where: { projectId: input.projectId },
        _max: { createdAt: true },
      }),
    ]);

    // A share link is the reviewer's credential. Only the roles that can create
    // reviewers and send links may read them; other members see send history.
    const canReadLinks =
      membership.role === "owner" || membership.role === "admin";

    const lastSentAt = new Map(
      latestSends.map((send) => [
        `${send.reviewerId}:${send.projectDomainId}`,
        send._max.createdAt,
      ]),
    );

    return reviewers.map((reviewer) => {
      const token = canReadLinks
        ? readToken(reviewer.id, reviewer.tokenCiphertext)
        : null;

      return {
        id: reviewer.id,
        name: reviewer.name,
        email: reviewer.email,
        isActive: reviewer.isActive,
        createdAt: reviewer.createdAt,
        feedbackCount: reviewer._count.feedback,
        isLegacyToken: reviewer.tokenCiphertext === null,
        // Legacy reviewers only have the lookup hash, which is not a valid
        // token, so they get no links until a send issues a new one.
        links: token
          ? domains.map((domain) => ({
              domainId: domain.id,
              host: domain.host,
              url: domain.url,
              shareUrl: buildReviewerShareUrl(domain.url, token),
            }))
          : [],
        sent: domains.flatMap((domain) => {
          const sentAt = lastSentAt.get(`${reviewer.id}:${domain.id}`);
          return sentAt
            ? [{ domainId: domain.id, host: domain.host, lastSentAt: sentAt }]
            : [];
        }),
      };
    });
  });

// A missing or rotated key must not take the whole list down; the reviewer
// then shows no links, and create/send still fail loudly on the same key.
function readToken(reviewerId: string, ciphertext: string | null) {
  if (!ciphertext) return null;
  try {
    return decryptReviewerToken(ciphertext);
  } catch (error) {
    console.error(`Failed to decrypt token for reviewer ${reviewerId}:`, error);
    return null;
  }
}

export type GetReviewersOutput = inferProcedureOutput<typeof getReviewers>;
