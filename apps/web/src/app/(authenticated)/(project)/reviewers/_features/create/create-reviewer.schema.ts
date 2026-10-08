import z from "zod";

import {
  ReviewerEmailSchema,
  ReviewerLinkDomainIdsSchema,
  ReviewerLinkMessageSchema,
} from "../send/send-reviewer-links.schema";

export const CreateReviewerSchema = z.object({
  projectId: z.string(),
  name: z.string().trim().min(1, "Name is required"),
  email: ReviewerEmailSchema,
  domainIds: ReviewerLinkDomainIdsSchema,
  message: ReviewerLinkMessageSchema,
  sendEmail: z.boolean().default(true),
});

export type CreateReviewerInputs = z.input<typeof CreateReviewerSchema>;
export type CreateReviewerOutputInput = z.output<typeof CreateReviewerSchema>;
