import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@workspace/db/generated/prisma/client";

export async function getFeedbackColumnById(
  prisma: PrismaClient,
  columnId: string,
) {
  const column = await prisma.feedbackColumn.findUnique({
    where: { id: columnId },
  });

  if (!column) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Column not found." });
  }

  return column;
}
