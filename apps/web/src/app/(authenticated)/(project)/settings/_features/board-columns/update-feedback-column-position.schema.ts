import z from "zod";

export const UpdateFeedbackColumnPositionSchema = z.object({
  columnId: z.string(),
  direction: z.enum(["up", "down"]),
});

export type UpdateFeedbackColumnPositionInput = z.infer<
  typeof UpdateFeedbackColumnPositionSchema
>;
