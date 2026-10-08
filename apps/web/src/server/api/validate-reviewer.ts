import { hashReviewerToken } from "@/server/reviewers/reviewer-token";
import { prisma } from "@workspace/db";

/**
 * Validates that a reviewer token belongs to an active reviewer in the given project.
 * Only the hash lookup is accepted: the former plaintext fallback let a stored
 * hash itself authenticate (ADR-0013). Production had no plaintext tokens left
 * when it was removed.
 * Returns the reviewer record or null if invalid/inactive.
 */
export async function validateReviewer(
  token: string | null,
  projectId: string,
) {
  if (!token) return null;

  return prisma.reviewer.findFirst({
    where: { tokenLookup: hashReviewerToken(token), projectId, isActive: true },
  });
}
