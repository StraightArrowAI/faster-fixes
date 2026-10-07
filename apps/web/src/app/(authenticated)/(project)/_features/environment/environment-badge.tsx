import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";

import type { EnvironmentColor } from "./environment-color.schema";

// User-assigned category colors, not UI semantics, so hardcoded palette classes
// are allowed here; keep them inside this component (tailwind-css-conventions).
const COLOR_CLASSES: Record<EnvironmentColor, string> = {
  gray: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300",
  red: "bg-red-500/15 text-red-700 dark:text-red-300",
  orange: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  amber: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  green: "bg-green-500/15 text-green-700 dark:text-green-300",
  blue: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  violet: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  pink: "bg-pink-500/15 text-pink-700 dark:text-pink-300",
};

export type EnvironmentBadgeProps = {
  environment: string;
  color?: EnvironmentColor;
  className?: string;
};

export function EnvironmentBadge({
  environment,
  color,
  className,
}: EnvironmentBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "max-w-32 truncate border-transparent",
        color && COLOR_CLASSES[color],
        className,
      )}
      title={environment}
    >
      {environment}
    </Badge>
  );
}
