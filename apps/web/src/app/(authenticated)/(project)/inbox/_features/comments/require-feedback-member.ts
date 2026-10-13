import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@workspace/db/generated/prisma/client";

// Comments are team-only, so every comment procedure resolves the Feedback's
// organization and requires the caller to be a member of it. Returns the
// member because authorship and moderation are keyed on Member, not User.
export async function requireFeedbackMember(
  prisma: PrismaClient,
  feedbackId: string,
  userId: string,
) {
  const feedback = await prisma.feedback.findUnique({
    where: { id: feedbackId },
    select: { id: true, project: { select: { organizationId: true } } },
  });

  if (!feedback) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Feedback not found." });
  }

  const member = await prisma.member.findFirst({
    where: { organizationId: feedback.project.organizationId, userId },
    select: { id: true, role: true },
  });

  if (!member) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Access denied." });
  }

  return member;
}
