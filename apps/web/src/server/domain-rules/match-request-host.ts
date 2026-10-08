import { normalizeDomain } from "@/app/_features/project/normalize-domain";

import {
  compileHostPattern,
  matchCompiledPattern,
} from "./compile-host-pattern";
import type { FeedbackTagsInput } from "./feedback-tags.schema";

export type TagExtractorInput = {
  pattern: string;
  fixedTags: FeedbackTagsInput;
};

export type ProjectDomainInput = {
  id: string;
  host: string;
  includeSubdomains: boolean;
  environment: string | null;
};

export type HostResolution =
  | { allowed: false }
  | { allowed: true; domainId: string | null; tags: FeedbackTagsInput };

// Loopback is always allowed so developers can try the widget before deploying;
// only code on the developer's machine can produce these origins.
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function normalizeHostname(hostname: string): string | null {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  // URL keeps IPv6 brackets ("[::1]"); strip them so loopback matching works.
  return host.replace(/^\[(.*)\]$/, "$1") || null;
}

export function getRequestHost(headers: Headers): string | null {
  const origin = headers.get("origin") ?? headers.get("referer");
  if (!origin) return null;
  try {
    return normalizeHostname(new URL(origin).hostname);
  } catch {
    return null;
  }
}

/**
 * The domain that allows `host`, or null. Exact-host entries beat subdomain
 * matches, then the longest host wins, so a dedicated entry's environment is
 * never shadowed by a broader one.
 */
export function matchProjectDomain<T extends ProjectDomainInput>(
  host: string,
  domains: T[],
): T | null {
  const exact = domains.find((d) => d.host === host);
  if (exact) return exact;

  let best: T | null = null;
  for (const domain of domains) {
    if (!domain.includeSubdomains || !host.endsWith(`.${domain.host}`))
      continue;
    if (!best || domain.host.length > best.host.length) best = domain;
  }
  return best;
}

export function extractHostTags(
  host: string,
  extractors: TagExtractorInput[],
): FeedbackTagsInput {
  for (const extractor of extractors) {
    const compiled = compileHostPattern(extractor.pattern);
    // Stored patterns are validated on save; skipping keeps a bad row from
    // taking down intake for the whole Project.
    if (!compiled.ok) continue;
    const captured = matchCompiledPattern(compiled.pattern, host);
    if (captured) return { ...extractor.fixedTags, ...captured };
  }
  return {};
}

// Projects created by the previous deploy during the build window have no
// domain rows yet; their legacy main domain keeps its old behavior.
function matchesLegacyDomain(host: string, fallbackDomain: string): boolean {
  const requestDomain = normalizeDomain(host);
  const expected = normalizeDomain(fallbackDomain);
  if (!requestDomain || !expected) return false;
  return requestDomain === expected || requestDomain.endsWith(`.${expected}`);
}

/**
 * Domains decide access; extractors only add tags (ADR-0013). Extractor tags
 * override the domain's environment because a pattern is more specific than a
 * domain that may cover many subdomains.
 */
export function resolveHost(
  host: string,
  project: {
    domains: ProjectDomainInput[];
    extractors: TagExtractorInput[];
    fallbackDomain: string;
  },
): HostResolution {
  const domain = matchProjectDomain(host, project.domains);
  const allowed =
    domain !== null ||
    LOOPBACK_HOSTS.has(host) ||
    (project.domains.length === 0 &&
      matchesLegacyDomain(host, project.fallbackDomain));
  if (!allowed) return { allowed: false };

  return {
    allowed: true,
    domainId: domain?.id ?? null,
    tags: {
      ...(domain?.environment ? { env: domain.environment } : {}),
      ...extractHostTags(host, project.extractors),
    },
  };
}
