# Domain rules and environments

- **Date**: 2026-10-07
- **Status**: Approved
- **Decision record**: [ADR-0012](../adr/0012-domain-rules-allow-any-host-and-derive-tags.md)

## Goal

1. Let a Project accept widget requests from more than its single registered domain:
   unrelated hosts (Vercel previews, a client's own domain) and dev URL patterns.
2. Record which **environment** (and other context, e.g. account) each Feedback came
   from, derived automatically from the request host using a template such as
   `rms.{env}.straightarrow.ai`, or passed explicitly by the host app.
3. Show the environment on board cards and filter the board by it.
4. Fix kanban column widths: columns resize between a min and max width instead of
   overflowing on a wide desktop.

## Non-goals (v1)

- Copying tags into GitHub / Linear / Jira issues or Slack messages.
- Re-tagging existing Feedback when rules change. Tags are fixed at submission.
- Deriving tags from `pageUrl` (client-reported, spoofable) or from the host app's
  server response headers (not visible to the widget or our API).
- Filtering by tags other than `env`.
- Plan-based limits on the number of domain rules.

## Concepts

- **Domain rule**: an ordered, per-Project host pattern with optional fixed tags. The
  first rule matching the request host allows the request and supplies tags.
- **Tag**: a `key → value` string pair on a Feedback (`env=dev`, `account=acme`).
- **Environment**: the tag with key `env`. The only tag with dedicated UI (card badge,
  color, board filter).

`Project.domain` (the **main domain**) keeps its exact current behavior: the domain
itself plus any subdomain, plus `localhost`, `127.0.0.1`, `::1`. Rules are additive.
Reviewer share links keep using the main domain.

## Pattern syntax

A pattern is a hostname: no protocol, port, or path. Lowercased on save.

Each dot-separated label is a sequence of:

| Token | Matches | Captured |
| --- | --- | --- |
| literal (`a-z`, `0-9`, `-`) | itself | no |
| `*` | one or more of `[a-z0-9-]` within the label | no |
| `{name}` | one or more of `[a-z0-9-]` within the label | yes, as tag `name` |

`name` matches `[a-z][a-z0-9_]{0,31}`. Tokens never cross a dot, so `{env}` can match
`dev` but never `dev.evil`.

Validation (rejected on save, with a message):

- Two adjacent wildcard tokens in one label (`{a}{b}`, `*{a}`).
- A placeholder name used twice in one pattern.
- The last two labels are not both pure literals (`*.com`, `rms.{x}.app`). This
  fixes at least a domain and TLD; it cannot know public suffixes, so
  `{x}.vercel.app` passes and gets the shared-hosting warning below.
- Exception: the single literal label `localhost` is a valid pattern.
- Invalid characters, empty labels, total length over 253.
- A fixed tag key that is also a placeholder name in the same rule.

UI warning (not an error): a label consisting only of `*` or `{name}` directly under a
shared hosting suffix (`vercel.app`, `netlify.app`, `pages.dev`, `onrender.com`,
`fly.dev`, `ngrok-free.app`, `github.io`). Anyone can deploy there, and the origin check
is the only gate on unauthenticated widget endpoints.

## Matching

1. Host = `Origin` header, falling back to `Referer`; parsed as a URL, hostname
   lowercased, trailing dot removed. Port ignored. `www.` is **not** stripped. No
   header → rejected (unchanged).
2. For each rule in `position` order: match only if the host has the same number of
   labels as the pattern and every label matches its anchored regex. With two tokens
   in one label (`{a}-{b}`) matching is greedy left to right: `x-y-z` → `a=x-y, b=z`.
3. First matching rule → `{ allowed: true, ruleTags }`.
4. No rule matches → the current main-domain check, unchanged → `{ allowed, ruleTags: {} }`.

## Tag merge

Applied on `POST /api/v1/feedback` only, later steps overriding earlier ones:

1. App-supplied tags (widget `tags` prop).
2. Matched rule's fixed tags.
3. Matched rule's captured tags.

The host is browser-set and harder to forge than a prop, hence rule tags win.

App-supplied tag validation (`CreateFeedbackSchema`): keys `[a-z][a-z0-9_]{0,31}`,
values trimmed, 1–64 chars, at most 10 entries. Invalid → 400. Fixed tags on a rule use
the same key/value rules.

Example rule set:

| # | Pattern | Fixed tags |
| --- | --- | --- |
| 1 | `{account}.rms.{env}.straightarrow.ai` | — |
| 2 | `rms.{env}.straightarrow.ai` | — |
| 3 | `straightarrow-rms-*.vercel.app` | `env=preview` |
| 4 | `localhost` | `env=local` |

- `acme.rms.dev.straightarrow.ai` → `{ account: "acme", env: "dev" }`
- `rms.prod.straightarrow.ai` → `{ env: "prod" }`
- `straightarrow-rms-git-feat-x.vercel.app` → `{ env: "preview" }`
- `www.straightarrow.ai` (main domain `straightarrow.ai`) → allowed, no rule tags
- `other.vercel.app` → rejected

## Model

```prisma
model ProjectDomainRule {
  id        String   @id @default(uuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  projectId String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  pattern   String
  fixedTags Json     @default("{}") // Record<string, string>
  position  Int

  @@unique([projectId, pattern])
  @@index([projectId, position])
  @@map("project_domain_rule")
}

model Project {
  // ...existing fields
  domainRules       ProjectDomainRule[]
  environmentColors Json @default("{}") // Record<envValue, paletteKey>
}

model Feedback {
  // ...existing fields
  tags Json @default("{}") // Record<string, string>
}
```

## Migration

One additive migration: create `project_domain_rule`, add `project.environmentColors`
and `feedback.tags` with constant defaults (no table rewrite). No backfill. Safe with
the previously deployed code, which ignores all three (ADR-0011).

## Server

Pure module `apps/web/src/server/domain-rules/` (no Prisma or Next imports):

- `compile-host-pattern.ts`: validate a pattern, return an error message or a compiled
  matcher (per-label regexes + placeholder names). Used by the settings Zod schema and
  the server, so the UI and API share the same rules.
- `match-request-host.ts`: `(host, rules, mainDomain) → { allowed: false } | { allowed: true, ruleTags }`.
- `merge-feedback-tags.ts`: the merge order above.
- `shared-hosting-suffixes.ts`: the warning list.

Request path:

- `resolveProject` includes `domainRules` ordered by `position` in its existing query.
- `validateOrigin(headers, project.domain)` becomes `resolveRequestOrigin(headers, project)`
  returning `{ allowed, ruleTags }`. Same rejection response. All six callers switch:
  `widget/config`, `feedback` (POST, GET), `feedback/[id]` (two handlers),
  `[id]/screenshot`, `[id]/recording`. Only `POST /api/v1/feedback` stores tags.
- Patterns compile per request (a few short regexes); no cache.

## Widget and SDK

- `@fasterfixes/core`: config type gains `tags?: Record<string, string>`; the client
  sends it inside the `data` JSON of the feedback POST.
- `@fasterfixes/react`: `FeedbackProvider` gains a `tags` prop, passed through.
- Patch version bump on both packages. Older widgets send no tags.

## Board and inbox

- `get-feedback.trpc.query.ts` returns `tags`; the board fetches the Project's
  `environmentColors` once.
- **Card**: when `tags.env` is set, an env badge in the metadata row next to the page
  host, colored from `environmentColors`, falling back to the neutral `secondary`
  variant.
- **Detail panel**: all tags listed as `key: value`.
- **Environment filter**: a dropdown next to the page-URL filter, URL state `env` via
  `nuqs` (`filters/feedback-filters.schema.ts`). Options = distinct `tags->>'env'`
  values for the Project (new `filters/get-distinct-environments.trpc.query.ts`) plus
  "No environment". Hidden when no Feedback in the Project has an env. Applied the same
  way as the page-URL filter, on board, mobile, and archive views; the item count
  reflects it.

## Column widths

Desktop board (`kanban-board.client.tsx`): header and body wrappers get
`min-w-64 max-w-96 flex-[1_1_0]`. Columns share the row equally between 16rem and
24rem; the row scrolls horizontally only when all columns are at minimum. On very wide
screens the board stops growing and stays left-aligned.

The reported overflow (four columns overflow on a wide desktop, though four `min-w-64`
lanes plus gaps total about 1,072px) is not explained by the column classes alone. The
cause is to be reproduced in a browser at 1440px and 1920px with four columns and the
offending ancestor fixed before the class change is considered done.

## Settings UI

A **Domains & environments** section in project settings
(`settings/_features/domain-rules/`), mounted in `project-settings-tab.client.tsx` like
Board columns:

- **Main domain**: the existing field in the project form, unchanged; helper text points
  to the rules.
- **Domain rules**: ordered list, drag to reorder. Each row: pattern, fixed-tag chips,
  edit, delete. Add/edit dialog: pattern input with live validation via
  `compile-host-pattern`, the shared-hosting warning, a fixed-tags editor, and a
  **test box** (enter a hostname → allowed or not, the matching rule, resulting tags).
- **Environment colors**: one row per known env value (distinct values in Feedback plus
  fixed `env` values on rules), palette picker.
- Read: any Project member. Write: owner/admin (`require-project-member`).
- Copy: "Rules are evaluated in order. The first match determines the environment."

tRPC: `domainRules` router (`list`, `create`, `update`, `updatePosition`, `delete`) and
`project.updateEnvironmentColors`.

## Testing

- Add Vitest to `apps/web`, scoped to `src/server/domain-rules/`. Unit tests cover
  every validation rule, label-count matching, partial-label tokens, greedy capture,
  first-match ordering, main-domain fallback, localhost, port/trailing-dot/case
  normalization, look-alike hosts (`acme.com.evil.com`), and merge precedence.
- Manual: migration via `pnpm migrate:dev`; settings CRUD and reorder; submit from
  `localhost` and a rule-matched host (e.g. via `/etc/hosts`) and confirm stored tags;
  card badge, colors, filter; board widths at 1280, 1440, and 1920px with 3, 4, and 6
  columns.

## Unchanged

Reviewer token checks, `localhost` always allowed, rate limiting, CORS echo in
`proxy.ts`, tracker sync, Slack, MCP, Status/Column semantics.
