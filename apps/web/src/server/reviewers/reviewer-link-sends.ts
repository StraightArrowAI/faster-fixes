import "server-only";

import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@workspace/db/generated/prisma/client";
import crypto from "crypto";

import { selectReviewerLinkDomains } from "./reviewer-link-domains";
import {
  getReviewerLinkSendWindowStart,
  isReviewerLinkSendLimitReached,
  REVIEWER_LINK_SEND_LIMIT,
  REVIEWER_LINK_SEND_LIMIT_MESSAGE,
} from "./reviewer-link-send-limit";

export async function getReviewerLinkDomains(
  prisma: PrismaClient,
  projectId: string,
  domainIds: string[],
) {
  const projectDomains = await prisma.projectDomain.findMany({
    where: { projectId },
    orderBy: [{ isPrimary: "desc" }, { host: "asc" }],
    select: { id: true, url: true, host: true, isPrimary: true },
  });

  const selected = selectReviewerLinkDomains(projectDomains, domainIds);
  if (!selected.ok) {
    throw new TRPCError({ code: "BAD_REQUEST", message: selected.error });
  }
  return selected.domains;
}

// Check-then-send is not atomic; two concurrent sends at the edge of the limit
// can both pass. Acceptable: the limit guards against abuse, not exact quotas.
export async function assertReviewerLinkSendAllowed(
  prisma: PrismaClient,
  projectId: string,
  now = new Date(),
) {
  const recentSends = await prisma.reviewerLinkSend.findMany({
    where: {
      projectId,
      createdAt: { gte: getReviewerLinkSendWindowStart(now) },
    },
    distinct: ["sendId"],
    select: { sendId: true },
    take: REVIEWER_LINK_SEND_LIMIT,
  });

  if (isReviewerLinkSendLimitReached(recentSends.length)) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: REVIEWER_LINK_SEND_LIMIT_MESSAGE,
    });
  }
}

type CreateReviewerLinkSendsInput = {
  projectId: string;
  reviewerId: string;
  domainIds: string[];
  sentById: string;
  message?: string;
};

export async function createReviewerLinkSends(
  prisma: PrismaClient,
  {
    projectId,
    reviewerId,
    domainIds,
    sentById,
    message,
  }: CreateReviewerLinkSendsInput,
) {
  const sendId = crypto.randomUUID();

  await prisma.reviewerLinkSend.createMany({
    data: domainIds.map((projectDomainId) => ({
      sendId,
      projectId,
      reviewerId,
      projectDomainId,
      sentById,
      message: message || null,
    })),
  });

  return sendId;
}
