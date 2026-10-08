---
status: accepted
---

# Domains gate access; tag extractors only derive tags; reviewer tokens are encrypted

- **Date**: 2026-10-08
- **Supersedes**: the "one pattern does both allowlisting and tag extraction" section of
  ADR-0012

A Project now has a fixed list of **domains** (one primary, any number of alternatives,
each optionally including subdomains and optionally carrying an `env`). Domains alone
decide whether a widget request is allowed and are the link targets offered to
reviewers. ADR-0012's domain rules become **tag extractors**: ordered patterns that add
tags to an already-allowed request and never grant access.

## Why split what ADR-0012 merged

ADR-0012 merged access and extraction so the two lists could not drift. In use, two
needs pulled them apart: reviewer links need concrete URLs (a pattern like
`{account}.rms.{env}.straightarrow.ai` cannot produce one), and a pattern written to
read tags should not also widen access. Domains are concrete and reviewable; extractors
can be loose because they no longer gate anything. The drift ADR-0012 feared is bounded
because extractors only run on hosts a domain already allowed.

## Why per-domain "include subdomains" rather than exact hosts

Account-per-subdomain deployments would otherwise need an entry per customer, and the
existing main-domain behavior (domain + all subdomains) must keep working for live
installs. The migrated primary has it on; new alternatives default to off.

## Why encrypt reviewer tokens instead of hashing

Sending a reviewer links for additional domains after creation needs the raw token.
Hashing made that impossible, and the list's "Copy link" had been working only through
a plaintext fallback that let the stored hash itself authenticate — so the hash protected
nothing. Tokens are now AES-256-GCM encrypted (ADR-0003 scheme,
`REVIEWER_TOKEN_ENCRYPTION_KEY`) with a SHA-256 lookup column for validation, and the
plaintext fallback is removed. One token per reviewer, shared across domains; revoking
the reviewer revokes all their links.

## Consequences

- Rule-granted access ends; hosts that relied on a rule must be added as domains.
- Legacy reviewers (hash only) keep working until they are next sent a link, which
  issues a new token.
- `Project.domain` and `Reviewer.linkUrl` are kept in sync / unused until a contract
  deploy removes them.
