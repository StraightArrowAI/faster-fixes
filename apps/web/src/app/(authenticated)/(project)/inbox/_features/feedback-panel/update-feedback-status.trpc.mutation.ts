"use server";

import { inngest } from "@/server/inngest";
import { protectedProcedure } from "@/server/trpc/trpc";
import { TRPCError, type inferProcedureOutput } from "@trpc/server";
import { UpdateFeedbackStatusSchema } from "./update-feedback-status.schema";
import { updateFeedbackStatuses } from "@/server/feedback/update-feedback-statuses";

export const updateFeedbackStatus = protectedProcedure
  .input(UpdateFeedbackStatusSchema)
  .mutation(async ({ input, ctx }) => {
    const { prisma, session } = ctx;

    const feedback = await prisma.feedback.findUnique({
      where: { id: input.feedbackId },
      include: { project: { select: { organizationId: true } } },
    });

    if (!feedback) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Feedback not found.",
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

    await updateFeedbackStatuses(
      prisma,
      { id: input.feedbackId },
      input.status,
    );

    // Fire-and-forget: sync status to GitHub if linked
    inngest
      .send({
        name: "feedback/status-changed",
        // Dashboard edits are always a human in the inbox.
        data: {
          feedbackId: input.feedbackId,
          newStatus: input.status,
          actor: "user",
        },
      })
      .catch(() => {});

    return { id: input.feedbackId };
  });

export type UpdateFeedbackStatusOutput = inferProcedureOutput<
  typeof updateFeedbackStatus
>;
