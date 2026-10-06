import z from "zod";
import { FeedbackColumnNameSchema } from "./feedback-column-name.schema";

export const UpdateFeedbackColumnSchema = z.object({
  columnId: z.string(),
  name: FeedbackColumnNameSchema,
});

export type UpdateFeedbackColumnInput = z.infer<
  typeof UpdateFeedbackColumnSchema
>;
