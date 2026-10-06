import z from "zod";

export const DeleteFeedbackColumnSchema = z.object({
  columnId: z.string(),
});

export type DeleteFeedbackColumnInput = z.infer<
  typeof DeleteFeedbackColumnSchema
>;
