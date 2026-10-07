import { normalizeDomain } from "@/app/_features/project/normalize-domain";

import {
  compileHostPattern,
  matchCompiledPattern,
} from "./compile-host-pattern";
import type { FeedbackTagsInput } from "./feedback-tags.schema";

export type DomainRuleInput = {
  pattern: string;
  fixedTags: FeedbackTagsInput;
};

export type HostMatch =
  | { allowed: false }
  | { allowed: true; ruleTags: FeedbackTagsInput };

// Loopback is always allowed so developers can try the widget before deploying;
// only code on the developer's machine can produce these origins.
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function getRequestHost(headers: Headers): string | null {
  const origin = headers.get("origin") ?? headers.get("referer");
  if (!origin) return null;
  try {
    const hostname = new URL(origin).hostname.toLowerCase().replace(/\.$/, "");
    // URL keeps IPv6 brackets ("[::1]"); strip them so loopback matching works.
    return hostname.replace(/^\[(.*)\]$/, "$1") || null;
  } catch {
    return null;
  }
}

function matchesMainDomain(host: string, mainDomain: string): boolean {
  const requestDomain = normalizeDomain(host);
  const expected = normalizeDomain(mainDomain);
  if (!requestDomain || !expected) return false;
  return requestDomain === expected || requestDomain.endsWith(`.${expected}`);
}

export function matchRequestHost(
  host: string,
  rules: DomainRuleInput[],
  mainDomain: string,
): HostMatch {
  for (const rule of rules) {
    const compiled = compileHostPattern(rule.pattern);
    // Stored patterns are validated on save; skipping keeps a bad row from
    // taking down intake for the whole Project.
    if (!compiled.ok) continue;
    const captured = matchCompiledPattern(compiled.pattern, host);
    if (captured)
      return { allowed: true, ruleTags: { ...rule.fixedTags, ...captured } };
  }

  if (LOOPBACK_HOSTS.has(host) || matchesMainDomain(host, mainDomain)) {
    return { allowed: true, ruleTags: {} };
  }
  return { allowed: false };
}
