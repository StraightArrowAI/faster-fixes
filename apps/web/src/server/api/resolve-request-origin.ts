import {
  FeedbackTagsSchema,
  type FeedbackTagsInput,
} from "@/server/domain-rules/feedback-tags.schema";
import {
  getRequestHost,
  matchRequestHost,
  type HostMatch,
} from "@/server/domain-rules/match-request-host";

type ProjectOriginInput = {
  domain: string;
  domainRules: { pattern: string; fixedTags: unknown }[];
};

function parseFixedTags(value: unknown): FeedbackTagsInput {
  // fixedTags is validated on save; a malformed row only loses its tags rather
  // than rejecting requests the rule is meant to allow.
  const parsed = FeedbackTagsSchema.safeParse(value);
  return parsed.success ? parsed.data : {};
}

/**
 * Decides whether a widget request may proceed for a Project, and which tags
 * its host contributes. Domain rules are tried in order first, then the main
 * domain (and its subdomains) and loopback. See ADR-0012.
 */
export function resolveRequestOrigin(
  headers: Headers,
  project: ProjectOriginInput,
): HostMatch {
  const host = getRequestHost(headers);
  if (!host) return { allowed: false };

  const rules = project.domainRules.map((rule) => ({
    pattern: rule.pattern,
    fixedTags: parseFixedTags(rule.fixedTags),
  }));
  return matchRequestHost(host, rules, project.domain);
}
