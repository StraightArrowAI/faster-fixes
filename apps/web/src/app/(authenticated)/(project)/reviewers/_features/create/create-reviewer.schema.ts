import { parseReviewerLinkUrl } from "@/server/reviewers/reviewer-share-url";
import z from "zod";

export const CreateReviewerSchema = z.object({
  projectId: z.string(),
  name: z.string().trim().min(1, "Name is required"),
  // Empty means the main domain. Whether the host is allowed for the Project is
  // checked by the mutation, which has the domain rules.
  linkUrl: z
    .string()
    .trim()
    .max(2048)
    .optional()
    .superRefine((value, ctx) => {
      if (!value) return;
      const parsed = parseReviewerLinkUrl(value);
      if (!parsed.ok) ctx.addIssue({ code: "custom", message: parsed.error });
    }),
});

export type CreateReviewerInputs = z.infer<typeof CreateReviewerSchema>;
