import {
  FeedbackTagsSchema,
  type FeedbackTagsInput,
} from "@/server/domain-rules/feedback-tags.schema";
import {
  getRequestHost,
  type HostResolution,
  type ProjectDomainInput,
  resolveHost,
} from "@/server/domain-rules/match-request-host";

type ProjectOriginInput = {
  domain: string;
  domains: ProjectDomainInput[];
  tagExtractors: { pattern: string; fixedTags: unknown }[];
};

function parseFixedTags(value: unknown): FeedbackTagsInput {
  // fixedTags is validated on save; a malformed row only loses its tags rather
  // than rejecting requests the domain is meant to allow.
  const parsed = FeedbackTagsSchema.safeParse(value);
  return parsed.success ? parsed.data : {};
}

/**
 * Decides whether a widget request may proceed for a Project, and which tags
 * its host contributes. Domains decide access; tag extractors only add tags
 * (ADR-0013).
 */
export function resolveRequestOrigin(
  headers: Headers,
  project: ProjectOriginInput,
): HostResolution {
  const host = getRequestHost(headers);
  if (!host) return { allowed: false };

  return resolveHost(host, {
    domains: project.domains,
    extractors: project.tagExtractors.map((e) => ({
      pattern: e.pattern,
      fixedTags: parseFixedTags(e.fixedTags),
    })),
    fallbackDomain: project.domain,
  });
}
