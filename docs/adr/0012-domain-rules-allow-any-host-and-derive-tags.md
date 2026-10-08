---
status: accepted; access-control half superseded by ADR-0013
---

# Domain rules allow any host and derive Feedback tags from it

- **Date**: 2026-10-07
- **Supersedes**: the "Allowed origins = domain + subdomains" section of ADR-0005

A Project keeps its main domain (domain + any subdomain + localhost) and gains an ordered
list of **domain rules**: host patterns such as `{account}.rms.{env}.straightarrow.ai`
or `straightarrow-rms-*.vercel.app`, each with optional fixed tags. The first matching
rule both allows the widget request and supplies the Feedback's tags.

## Why lift the "one Project = one website" restriction

ADR-0005 rejected a free-form allowlist to protect per-Project pricing. In practice a
single product is served from unrelated hosts (Vercel previews, client custom domains,
dev URLs), and forcing a Project per host splits one product's Feedback across inboxes.
We accept that a customer could point one Project at several sites; a Project is now
one *product*, not one domain. Plan-based rule limits can be added later if abuse shows up.

## Why one pattern does both allowlisting and tag extraction

Separate allowlist and extraction-template lists drift: a template can match a host the
allowlist rejects, or an allowed host can have no extraction. One ordered list with
first-match-wins has a single answer for "why was this host accepted, and what is its
environment".

## Why tokens match within a single label

`{env}` and `*` never cross a dot, and the last two labels must be literal. Because the
pattern is also the access gate, a token that could match `dev.evil` or a pattern like
`*.com` would widen access far beyond what the author meant.

## Why rule tags override app-supplied tags

The host comes from the browser-set `Origin`; the `tags` prop is whatever the page's
script sends. When both name the same key, the harder-to-forge source wins.

## Consequences

- `validateOrigin` becomes `resolveRequestOrigin`, returning tags as well as the verdict.
- Tags are fixed at submission. Editing rules never re-tags existing Feedback.
- `*.vercel.app`-style rules accept anyone's deployment on that host; the settings UI
  warns about this rather than forbidding it.
