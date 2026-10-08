import z from "zod";

export const ReviewerEmailSchema = z
  .email("Enter a valid email address.")
  .max(254);

export const ReviewerLinkDomainIdsSchema = z
  .array(z.string())
  .min(1, "Choose at least one domain.");

export const ReviewerLinkMessageSchema = z.string().trim().max(1000).optional();

export const SendReviewerLinksSchema = z.object({
  projectId: z.string(),
  reviewerId: z.string(),
  email: ReviewerEmailSchema,
  domainIds: ReviewerLinkDomainIdsSchema,
  message: ReviewerLinkMessageSchema,
});

export type SendReviewerLinksInput = z.infer<typeof SendReviewerLinksSchema>;
