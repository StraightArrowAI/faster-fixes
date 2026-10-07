// Hosts where anyone can deploy a subdomain. A rule whose first label is only a
// wildcard under one of these accepts strangers' sites, so settings warns.
export const SHARED_HOSTING_SUFFIXES = [
  "vercel.app",
  "netlify.app",
  "pages.dev",
  "onrender.com",
  "fly.dev",
  "ngrok-free.app",
  "github.io",
] as const;

export function isOpenSharedHostPattern(pattern: string): boolean {
  const labels = pattern.trim().toLowerCase().split(".");
  if (labels.length !== 3) return false;
  const suffix = labels.slice(1).join(".");
  return (
    SHARED_HOSTING_SUFFIXES.some((s) => s === suffix) &&
    /^(\*|\{[a-z][a-z0-9_]*\})$/.test(labels[0]!)
  );
}
