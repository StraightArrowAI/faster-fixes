import {
  compileHostPattern,
  matchCompiledPattern,
} from "@/server/domain-rules/compile-host-pattern";
import {
  normalizeHostname,
  resolveHost,
  type ProjectDomainInput,
  type TagExtractorInput,
} from "@/server/domain-rules/match-request-host";

// Accepts a bare host or a full URL, mirroring how the server reads Origin.
export function parseTestHost(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    return normalizeHostname(new URL(withScheme).hostname);
  } catch {
    return null;
  }
}

export function getHostTestResult(
  host: string,
  project: {
    domains: (ProjectDomainInput & { url: string })[];
    extractors: TagExtractorInput[];
    fallbackDomain: string;
  },
) {
  const resolution = resolveHost(host, project);

  // resolveHost reports only ids and tags; the matched domain and extractor
  // are looked up here so the UI can name them. Extractors run only on allowed
  // hosts, so none is reported for a rejected one.
  const matchedDomain = resolution.allowed
    ? (project.domains.find((d) => d.id === resolution.domainId) ?? null)
    : null;
  const matchedExtractorIndex = resolution.allowed
    ? project.extractors.findIndex((extractor) => {
        const compiled = compileHostPattern(extractor.pattern);
        return (
          compiled.ok && matchCompiledPattern(compiled.pattern, host) !== null
        );
      })
    : -1;

  return { resolution, matchedDomain, matchedExtractorIndex };
}
