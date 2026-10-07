import z from "zod";

export const EnvironmentColorEnum = z.enum([
  "gray",
  "red",
  "orange",
  "amber",
  "green",
  "blue",
  "violet",
  "pink",
]);

export type EnvironmentColor = z.infer<typeof EnvironmentColorEnum>;

export const EnvironmentColorsSchema = z.record(
  z.string().trim().min(1).max(64),
  EnvironmentColorEnum,
);

export type EnvironmentColors = z.infer<typeof EnvironmentColorsSchema>;

/** Parses the stored JSON column, dropping anything that no longer validates. */
export function parseEnvironmentColors(value: unknown): EnvironmentColors {
  const result = EnvironmentColorsSchema.safeParse(value);
  return result.success ? result.data : {};
}
