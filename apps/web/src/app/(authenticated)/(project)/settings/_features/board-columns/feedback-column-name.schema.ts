import z from "zod";

export const FeedbackColumnNameSchema = z
  .string()
  .trim()
  .min(1, "Name is required.")
  .max(40, "Name must be 40 characters or fewer.");

export type FeedbackColumnNameInput = z.infer<
  typeof FeedbackColumnNameSchema
>;
