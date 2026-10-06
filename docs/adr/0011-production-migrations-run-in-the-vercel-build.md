---
status: accepted
---

# Production migrations run in the Vercel production build

A Vercel production build runs `prisma migrate deploy` before `next build`
(`apps/web/vercel.json` → `packages/database/scripts/migrate-on-vercel.mjs`). If the
migration fails, the build fails and the previous deployment keeps serving.

## Context

Pushing to `main` deploys to production, but the build only ran `prisma generate`.
Migrations were applied by whoever shipped, by hand, just before pushing. On
2026-10-06 a push shipped code that read `feedback.columnId` before the migration ran;
because Prisma selects every scalar by default, every Feedback read and write failed
until the migration was applied.

## Decision

- **Build command, not a turbo task.** The migrate step runs ahead of
  `turbo run build`, outside turbo's cache. As a cached task, a preview build that
  skipped migrating could be replayed for the production build with the same inputs.
- **Production only.** The script exits early unless `VERCEL_ENV=production`; only
  production has a `DATABASE_URL`, and a preview must never migrate production.
- **Same `DATABASE_URL` as the app.** No separate migration credential. Prisma Migrate
  needs session-level advisory locks, which Supavisor's transaction mode (port 6543)
  lacks, so a `*.pooler.supabase.com:6543` URL is switched to session mode on port 5432
  of the same host for the migrate step only.

## Alternatives considered

- **Supabase GitHub integration.** Applies `supabase/migrations` on push, but runs
  independently of the Vercel deploy, so new code can still go live first, and a failed
  migration does not stop it. It would also mean a second migration system next to
  Prisma, which owns the schema and generates the client.
- **Migrate on application start.** Prisma has no such mode; on serverless every cold
  start would attempt it.
- **Manual `migrate:prod` before push.** What failed.

## Consequences

- Migrations must be backward-compatible with the previous deploy (expand, then
  contract): the old code serves while the new build runs.
- Instant rollbacks do not rebuild, so they do not revert migrations.
