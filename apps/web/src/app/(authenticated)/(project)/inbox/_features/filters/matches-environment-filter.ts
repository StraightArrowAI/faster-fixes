import { NO_ENVIRONMENT_FILTER } from "./no-environment-filter";

export function matchesEnvironmentFilter(
  tags: Record<string, string>,
  envFilter: string | null,
): boolean {
  if (!envFilter) return true;
  if (envFilter === NO_ENVIRONMENT_FILTER) return !tags.env;
  return tags.env === envFilter;
}
