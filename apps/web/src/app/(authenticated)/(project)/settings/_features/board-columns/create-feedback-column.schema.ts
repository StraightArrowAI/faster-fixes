import { FeedbackColumnCategoryEnum } from "@/types/feedback-status";
import z from "zod";
import { FeedbackColumnNameSchema } from "./feedback-column-name.schema";

export const CreateFeedbackColumnSchema = z.object({
  projectId: z.string(),
  name: FeedbackColumnNameSchema,
  category: FeedbackColumnCategoryEnum,
});

export type CreateFeedbackColumnInput = z.infer<
  typeof CreateFeedbackColumnSchema
>;
