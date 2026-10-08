// Mirrors URL_PARAM_TOKEN in @fasterfixes/core, which reads it on page load.
const TOKEN_PARAM = "ff_token";

export function buildReviewerShareUrl(
  domainUrl: string,
  token: string,
): string {
  const url = new URL(domainUrl);
  url.searchParams.set(TOKEN_PARAM, token);
  return url.toString();
}
