import { compileHostPattern } from "@/server/domain-rules/compile-host-pattern";

// A fixed tag sharing a placeholder's name would be silently overwritten by the
// captured value (captured tags win in the merge), so it is rejected instead.
export function findFixedTagPlaceholderConflicts(
  pattern: string,
  tagKeys: string[],
) {
  const compiled = compileHostPattern(pattern);
  if (!compiled.ok) return [];
  return tagKeys.filter((key) => compiled.pattern.placeholders.includes(key));
}

export function formatPlaceholderConflictMessage(key: string) {
  return `"${key}" is already captured by the {${key}} placeholder.`;
}
