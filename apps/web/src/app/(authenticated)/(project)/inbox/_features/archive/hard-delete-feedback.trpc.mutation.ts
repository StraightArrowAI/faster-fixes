"use server";

import { deleteFeedbackMedia } from "@/server/storage/delete-feedback-media";
import { protectedProcedure } from "@/server/trpc/trpc";
import { TRPCError } from "@trpc/server";
import { HardDeleteFeedbackSchema } from "./hard-delete-feedback.schema";

export const hardDeleteFeedback = protectedProcedure
  .input(HardDeleteFeedbackSchema)
  .mutation(async ({ input, ctx }) => {
    const { prisma, session } = ctx;

    const feedback = await prisma.feedback.findUnique({
      where: { id: input.feedbackId },
      include: { project: { select: { organizationId: true } } },
    });

    if (!feedback) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Feedback not found." });
    }

    if (feedback.status !== "closed") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Only archived feedback can be permanently deleted.",
      });
    }

    const membership = await prisma.member.findFirst({
      where: {
        organizationId: feedback.project.organizationId,
        userId: session.user.id,
      },
    });

    if (!membership) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Access denied." });
    }

    await deleteFeedbackMedia({ id: input.feedbackId });

    await prisma.feedback.delete({
      where: { id: input.feedbackId },
    });

    return { id: input.feedbackId };
  });
