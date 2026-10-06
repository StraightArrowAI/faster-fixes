import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@workspace/db/generated/prisma/client";

// Reading columns is open to any member (the board needs them); editing the
// board's shape is a settings change, so it follows the owner/admin rule the
// other project settings use.
export async function requireProjectMember(
  prisma: PrismaClient,
  projectId: string,
  userId: string,
  opts: { admin: boolean },
) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { organizationId: true },
  });

  if (!project) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
  }

  const membership = await prisma.member.findFirst({
    where: {
      organizationId: project.organizationId,
      userId,
      ...(opts.admin && { role: { in: ["owner", "admin"] } }),
    },
  });

  if (!membership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: opts.admin
        ? "Only owners and admins can edit board columns."
        : "Access denied.",
    });
  }
}
