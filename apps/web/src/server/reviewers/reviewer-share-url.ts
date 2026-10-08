import { normalizeHostname } from "@/server/domain-rules/match-request-host";

// Mirrors URL_PARAM_TOKEN in @fasterfixes/core, which reads it on page load.
const TOKEN_PARAM = "ff_token";

export type ParseReviewerLinkUrlResult =
  | { ok: true; url: string; host: string }
  | { ok: false; error: string };

// A scheme followed by a digit is a port ("localhost:3000"), not a scheme.
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:(?!\d)/i;

export function parseReviewerLinkUrl(raw: string): ParseReviewerLinkUrlResult {
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
  if (!host) return { ok: false, error: "Enter a valid URL." };

  // The token is appended per reviewer; a pasted link may carry someone else's.
  url.searchParams.delete(TOKEN_PARAM);
  return { ok: true, url: url.toString(), host };
}

export function buildReviewerShareUrl(
  linkUrl: string | null,
  mainDomain: string,
  token: string,
): string {
  const parsed = linkUrl ? parseReviewerLinkUrl(linkUrl) : null;
  const url = new URL(parsed?.ok ? parsed.url : `https://${mainDomain}`);
  url.searchParams.set(TOKEN_PARAM, token);
  return url.toString();
}
