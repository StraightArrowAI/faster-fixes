import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@workspace/db/generated/prisma/client";

export async function assertUniqueColumnName(
  prisma: PrismaClient,
  projectId: string,
  name: string,
  excludeColumnId?: string,
) {
  const clash = await prisma.feedbackColumn.findFirst({
    where: {
      projectId,
      name: { equals: name, mode: "insensitive" },
      ...(excludeColumnId && { id: { not: excludeColumnId } }),
    },
    select: { id: true },
  });

  if (clash) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "A column with this name already exists.",
    });
  }
}
