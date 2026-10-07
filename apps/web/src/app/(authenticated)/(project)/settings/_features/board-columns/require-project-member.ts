import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@workspace/db/generated/prisma/client";

// Reading project config is open to any member (the board needs it); editing it
// is a settings change, so it follows the owner/admin rule the other project
// settings use. Shared by board columns and domain rules, hence the optional
// message; the default keeps the columns wording.
export async function requireProjectMember(
  prisma: PrismaClient,
  projectId: string,
  userId: string,
  opts: { admin: boolean; forbiddenMessage?: string },
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
        ? (opts.forbiddenMessage ??
          "Only owners and admins can edit board columns.")
        : "Access denied.",
    });
  }
}
