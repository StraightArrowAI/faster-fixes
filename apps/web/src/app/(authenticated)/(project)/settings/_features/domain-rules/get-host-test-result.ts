import {
  compileHostPattern,
  matchCompiledPattern,
} from "@/server/domain-rules/compile-host-pattern";
import {
  matchRequestHost,
  type DomainRuleInput,
} from "@/server/domain-rules/match-request-host";

// Accepts a bare host or a full URL, mirroring how the server reads Origin.
export function parseTestHost(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const hostname = new URL(withScheme).hostname
      .toLowerCase()
      .replace(/\.$/, "")
      .replace(/^\[(.*)\]$/, "$1");
    return hostname || null;
  } catch {
    return null;
  }
}

export function getHostTestResult(
  host: string,
  rules: DomainRuleInput[],
  mainDomain: string,
) {
  // matchRequestHost reports only the verdict; the index is recomputed here so
  // the UI can name the rule that won.
  const matchedIndex = rules.findIndex((rule) => {
    const compiled = compileHostPattern(rule.pattern);
    return compiled.ok && matchCompiledPattern(compiled.pattern, host) !== null;
  });

  return {
    match: matchRequestHost(host, rules, mainDomain),
    matchedIndex,
  };
}
