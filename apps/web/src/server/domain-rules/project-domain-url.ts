import { normalizeDomain } from "@/app/_features/project/normalize-domain";

import { normalizeHostname } from "./match-request-host";

export type ParseProjectDomainUrlResult =
  | { ok: true; url: string; host: string }
  | { ok: false; error: string };

// A scheme followed by a digit is a port ("acme.com:8080"), not a scheme.
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:(?!\d)/i;

/**
 * Normalizes a domain entry to `origin + path`. Query and fragment are dropped:
 * the entry is a place to send reviewers, and the share link adds its own query.
 */
export function parseProjectDomainUrl(
  raw: string,
): ParseProjectDomainUrlResult {
  const value = raw.trim();
  if (!value) return { ok: false, error: "Enter a URL." };

  let url: URL;
  try {
    url = new URL(HAS_SCHEME.test(value) ? value : `https://${value}`);
  } catch {
    return { ok: false, error: "Enter a valid URL." };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ok: false, error: "Use an http or https URL." };
  }

  const host = normalizeHostname(url.hostname);
  // Same rules as the main domain always had: a real domain name, no IPs or
  // bare hosts. Loopback is allowed without an entry.
  if (!host || normalizeDomain(host) === null) {
    return { ok: false, error: "Enter a domain name, e.g. app.example.com." };
  }

  const port = url.port ? `:${url.port}` : "";
  const path = url.pathname.replace(/\/+$/, "");
  return { ok: true, url: `${url.protocol}//${host}${port}${path}`, host };
}
