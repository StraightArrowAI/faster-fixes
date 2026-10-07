import { EnvironmentColorsSchema } from "@/app/(authenticated)/(project)/_features/environment/environment-color.schema";
import z from "zod";

export const UpdateEnvironmentColorsSchema = z.object({
  projectId: z.string(),
  colors: EnvironmentColorsSchema,
});

export type UpdateEnvironmentColorsInput = z.infer<
  typeof UpdateEnvironmentColorsSchema
>;
