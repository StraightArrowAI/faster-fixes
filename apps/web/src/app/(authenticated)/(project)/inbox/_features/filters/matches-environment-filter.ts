import { NO_ENVIRONMENT_FILTER } from "./feedback-filters.schema";

export function matchesEnvironmentFilter(
  tags: Record<string, string>,
  envFilter: string | null,
): boolean {
  if (!envFilter) return true;
  if (envFilter === NO_ENVIRONMENT_FILTER) return !tags.env;
  return tags.env === envFilter;
}
