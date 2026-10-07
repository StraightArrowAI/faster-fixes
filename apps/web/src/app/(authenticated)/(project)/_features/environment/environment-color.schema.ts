import z from "zod";

export const EnvironmentColorSchema = z.enum([
  "gray",
  "red",
  "orange",
  "amber",
  "green",
  "blue",
  "violet",
  "pink",
]);

export type EnvironmentColorInput = z.infer<typeof EnvironmentColorSchema>;

export const EnvironmentColorsSchema = z.record(
  z.string().trim().min(1).max(64),
  EnvironmentColorSchema,
);

export type EnvironmentColorsInput = z.infer<typeof EnvironmentColorsSchema>;

/** Parses the stored JSON column, dropping anything that no longer validates. */
export function parseEnvironmentColors(value: unknown): EnvironmentColorsInput {
  const result = EnvironmentColorsSchema.safeParse(value);
  return result.success ? result.data : {};
}
