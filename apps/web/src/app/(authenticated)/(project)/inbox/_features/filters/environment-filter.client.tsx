"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { NO_ENVIRONMENT_FILTER } from "./feedback-filters.schema";

// Radix Select rejects an empty item value, so "all" needs its own sentinel;
// it maps back to a null URL param so the default state keeps a clean URL.
const ALL_ENVIRONMENTS = "__all__";

type EnvironmentFilterProps = {
  environments: string[];
  selectedEnvironment: string | null;
  onEnvironmentChange: (env: string | null) => void;
};

export function EnvironmentFilter({
  environments,
  selectedEnvironment,
  onEnvironmentChange,
}: EnvironmentFilterProps) {
  // Nothing to filter by until at least one feedback carries an env tag.
  if (environments.length === 0) return null;

  return (
    <Select
      value={selectedEnvironment ?? ALL_ENVIRONMENTS}
      onValueChange={(value) =>
        onEnvironmentChange(value === ALL_ENVIRONMENTS ? null : value)
      }
    >
      <SelectTrigger className="w-full sm:w-[180px]" aria-label="Environment">
        <SelectValue placeholder="Environment" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_ENVIRONMENTS}>All environments</SelectItem>
        <SelectSeparator />
        {environments.map((env) => (
          <SelectItem key={env} value={env}>
            <span className="truncate">{env}</span>
          </SelectItem>
        ))}
        <SelectItem value={NO_ENVIRONMENT_FILTER}>No environment</SelectItem>
      </SelectContent>
    </Select>
  );
}
