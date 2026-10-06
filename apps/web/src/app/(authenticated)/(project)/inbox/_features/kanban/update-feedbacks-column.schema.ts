import z from "zod";

export const UpdateFeedbacksColumnSchema = z.object({
  feedbackIds: z.array(z.string()).min(1),
  columnId: z.string(),
});

export type UpdateFeedbacksColumnInput = z.infer<
  typeof UpdateFeedbacksColumnSchema
>;
