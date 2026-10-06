import { spawnSync } from "node:child_process";

// Production deploys apply pending migrations before the app is built, so new
// code can never go live ahead of its schema (the 2026-10-06 inbox outage). A
// failed migration fails the build, and Vercel keeps serving the previous
// deployment. See ADR-0011.

const env = process.env.VERCEL_ENV;

// Only production has a DATABASE_URL, and a preview build must never be able
// to migrate the production database.
if (env !== "production") {
  console.log(`[migrate] Skipped: VERCEL_ENV=${env ?? "unset"}`);
  process.exit(0);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[migrate] DATABASE_URL is not set for this production build.");
  process.exit(1);
}

// Prisma Migrate needs session-level advisory locks, which Supavisor's
// transaction mode (port 6543) does not provide. Supabase serves session mode
// on port 5432 of the same pooler host with the same credentials.
function toMigrationUrl(raw) {
  const parsed = new URL(raw);
  if (parsed.hostname.endsWith(".pooler.supabase.com") && parsed.port === "6543") {
    parsed.port = "5432";
    parsed.searchParams.delete("pgbouncer");
    console.log("[migrate] Using Supavisor session mode (port 5432) for migrations.");
  }
  return parsed.toString();
}

const result = spawnSync("prisma", ["migrate", "deploy"], {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: toMigrationUrl(url) },
});

if (result.error) {
  console.error(`[migrate] Could not run prisma: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
