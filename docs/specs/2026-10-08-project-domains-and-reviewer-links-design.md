# Project domains, tag extractors, and reviewer links

- **Date**: 2026-10-08
- **Status**: Approved
- **Decision record**: [ADR-0013](../adr/0013-domains-gate-access-extractors-derive-tags.md)
- **Builds on**: [Domain rules and environments](2026-10-07-domain-rules-and-environments-design.md)

## Goal

1. Give each Project a fixed list of **domains** — one primary and any number of
   alternatives — that both gate widget access and serve as the link targets offered
   when inviting or messaging reviewers. Each domain can carry an `env` tag.
2. Re-scope domain rules as **tag extractors**: patterns that derive tags from the
   request host but no longer grant access.
3. Let a dashboard user **send reviewer links by email** for one or more domains, and see
   which domains each reviewer has been sent.
4. Store reviewer tokens so links can be rebuilt after creation, and close the hole
   where a stored token hash works as a token.

## Non-goals

- A separate token per domain. A reviewer has one token for all domains (decided
  during design); revoking the reviewer revokes every link.
- Editing a reviewer's name after creation.
- Tracking email delivery, opens, or clicks.
- Re-tagging existing Feedback.
- Dropping `Project.domain` (a later contract deploy).

## Domains

```prisma
model ProjectDomain {
  id        String   @id @default(uuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  projectId String
  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  url               String  // origin + optional path, e.g. https://rms.dev.straightarrow.ai/app
  host              String  // normalized hostname derived from url, used for matching
  includeSubdomains Boolean @default(false)
  environment       String? // becomes the `env` tag
  isPrimary         Boolean @default(false)

  sends ReviewerLinkSend[]

  @@unique([projectId, host])
  @@index([projectId])
  @@map("project_domain")
}
```

- Exactly one primary per Project, enforced in the mutations (set-primary runs in a
  transaction that clears the previous primary). The primary cannot be deleted.
- `url` accepts `https://`/`http://` and an optional path; query and fragment are
  dropped. `host` is stored normalized (lowercase, no trailing dot) and is unique per
  Project.
- `environment` follows the tag value rules (1–64 chars, trimmed).
- **Access**: a request is allowed when its host equals an entry's `host`, or ends with
  `.` + `host` and the entry has `includeSubdomains`. Loopback (`localhost`,
  `127.0.0.1`, `::1`) is always allowed. When several entries match, the most specific
  wins: exact-host matches before subdomain matches, then the longest `host`.
- `Project.domain` is kept in sync with the primary entry's host on every write, for
  the previously deployed code and for anything still reading it. A later deploy drops it.
- The project settings "Domain" field becomes the Domains list. Both create-project
  mutations create the primary entry (`includeSubdomains = true`, matching today's
  main-domain behavior).

## Tag extractors

The existing domain-rule rows, re-scoped. The Prisma model is renamed but the table name
is kept so the previously deployed code keeps working during the build window:

```prisma
model ProjectTagExtractor {
  // fields unchanged: id, timestamps, projectId, pattern, fixedTags, position
  @@map("project_domain_rule")
}
```

- Same `{name}` / `*` syntax, ordered, first match wins, fixed tags + captures.
- Evaluated only after access is granted; never grant access.
- The "last two labels must be literal" rule is dropped (it existed only because the
  pattern gated access). Kept: single-label tokens, max two tokens per label, no
  adjacent tokens, DNS length bounds on the host — the host is still client-controlled.
- Settings section renamed to "Tag extractors"; the test box reports access (via
  Domains) and tags (via extractors) separately.

## Tag precedence

`app tags (widget prop) < matched domain's environment (as env) < extractor tags`
(fixed, then captured). Later wins. App tags stay best-effort (`sanitizeAppTags`).

## Origin resolution

`resolveRequestOrigin(headers, project)` keeps its signature and return shape
(`{ allowed, ruleTags }` → renamed `{ allowed, tags }` for the host-derived part).
`resolveProject` includes `domains` and `tagExtractors`. A pure
`match-project-domain.ts` picks the domain; `extract-host-tags.ts` runs extractors.
Both are unit tested.

## Reviewers

```prisma
model Reviewer {
  // ...existing
  tokenLookup     String  @unique @map("token") // sha256(raw token); unchanged column
  tokenCiphertext String? // AES-256-GCM, REVIEWER_TOKEN_ENCRYPTION_KEY; null = legacy
  email           String?

  sends ReviewerLinkSend[]
}

model ReviewerLinkSend {
  id        String   @id @default(uuid())
  createdAt DateTime @default(now())

  reviewerId      String
  reviewer        Reviewer      @relation(fields: [reviewerId], references: [id], onDelete: Cascade)
  projectDomainId String
  projectDomain   ProjectDomain @relation(fields: [projectDomainId], references: [id], onDelete: Cascade)
  sentById        String        // Member.id of the sender
  message         String?

  @@index([reviewerId])
  @@map("reviewer_link_send")
}
```

- `reviewer.token` already holds `sha256(raw)` for every reviewer created since token
  hashing; the field is renamed in Prisma only. No data migration.
- **Validation** (`validate-reviewer.ts`): `tokenLookup = sha256(token)`, Project
  match, active. The plaintext fallback is removed. Reviewers created before hashing
  (plaintext in `token`) stop working; verify the count is zero in production first.
- **Encryption**: reuse `apps/web/src/utils/crypto/aes-gcm.ts` with
  `REVIEWER_TOKEN_ENCRYPTION_KEY` (added to `apps/web/.env.example`). Missing or
  malformed key fails the reviewer create/send call loudly; it does not affect widget
  intake.
- **Legacy reviewers** (`tokenCiphertext` null): existing links keep working. "Copy
  link" is replaced with "Send a link to issue a new one." The first send issues a new
  token (new lookup + ciphertext), invalidating the old one; the dialog says so.
- `Reviewer.linkUrl` (shipped 2026-10-08) is superseded by domain selection: the share
  URL is built from a ProjectDomain. The column stays unused until a contract deploy.

## Creating and sending

**Add reviewer** dialog: Name, Email (required), Domains (checklist; primary checked and
locked, alternatives optional), Message (optional, ≤ 1000 chars), "Send invite email"
(checked by default). After creation the primary link is shown once to copy, as today.

**Send link**: a row action on active reviewers. Dialog: Email (prefilled, editable;
saved to the reviewer when changed), Domains checklist (primary locked), Message
(optional). Sends one email and writes one `reviewer_link_send` row per domain.

**Email** (React email template through `createMailer()` / Resend):

- Subject: `Review access for {project name}`
- Body: optional message; primary link as the main button; alternative links listed
  below "for your records"; a short line on what the link does. No exclamation marks.
  Plain-text alternative included.

**Share URL**: `buildReviewerShareUrl(domain.url, token)` — sets `ff_token`, keeps the
domain's path.

**Rate limit**: at most 20 sends per Project per rolling hour, counted from
`reviewer_link_send` (distinct send events, not rows). Exceeding it returns a clear
error.

**Permissions**: create and send — owner/admin. Read — any member.

## Reviewers table

- **Sent** column: each domain the reviewer has been sent, with the latest send date
  (`rms.dev.straightarrow.ai · Oct 8`). Empty: "Not sent".
- **Copy link**: a dropdown with one item per Project domain. Hidden for legacy
  reviewers (see above).
- **Send link** button on active rows.

## Migration (expand only)

One migration, safe for the previously deployed code:

1. Create `project_domain`; insert one primary row per Project from `project.url`
   (`url = 'https://' || url`, `host = url`, `includeSubdomains = true`).
2. Create `reviewer_link_send`.
3. Add `reviewer.tokenCiphertext`, `reviewer.email` (nullable).
4. No change to `project_domain_rule` or `reviewer.token`.

**Before deploying**:

- Add `REVIEWER_TOKEN_ENCRYPTION_KEY` in Vercel production.
- Check production for hosts that only a domain rule allows today: rule-granted access
  ends with this change. List `project_domain_rule` rows per Project and add matching
  domains after deploy (or tell us to seed them in the migration).
- Check for reviewers whose `token` is not a 64-char hex hash (pre-hash plaintext);
  they lose access when the fallback is removed.

## Testing

Unit (Vitest): domain matching (exact, subdomain flag, specificity, loopback,
look-alikes, case/trailing dot), extractor matching without the literal-suffix rule,
tag precedence, URL normalization for domain entries, share URL with paths, token
encrypt/decrypt round trip and lookup, rate-limit window calculation.

Manual (production after deploy, no local env): settings CRUD for domains and
extractors; add reviewer with two domains and email; Send link; Sent column; legacy
reviewer flow; widget submission from primary and alternative hosts with env tags.
