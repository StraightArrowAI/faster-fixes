type LinkDomain = {
  id: string;
  isPrimary: boolean;
};

type SelectReviewerLinkDomainsResult<T extends LinkDomain> =
  | { ok: true; domains: T[] }
  | { ok: false; error: string };

/**
 * Picks the requested domains out of the Project's list, keeping the Project's
 * order (primary first) so the email's main button is always the primary link.
 * The primary is required because it is the link shown after creation and the
 * one every reviewer is expected to have.
 */
export function selectReviewerLinkDomains<T extends LinkDomain>(
  projectDomains: T[],
  requestedIds: string[],
): SelectReviewerLinkDomainsResult<T> {
  const requested = new Set(requestedIds);
  const known = new Set(projectDomains.map((domain) => domain.id));

  if ([...requested].some((id) => !known.has(id))) {
    return {
      ok: false,
      error: "One or more domains do not belong to this project.",
    };
  }

  const primary = projectDomains.find((domain) => domain.isPrimary);
  if (!primary) {
    return {
      ok: false,
      error: "This project has no primary domain. Add one in settings.",
    };
  }

  if (!requested.has(primary.id)) {
    return { ok: false, error: "The primary domain must be included." };
  }

  const ordered = [
    primary,
    ...projectDomains.filter(
      (domain) => !domain.isPrimary && requested.has(domain.id),
    ),
  ];

  return { ok: true, domains: ordered };
}
