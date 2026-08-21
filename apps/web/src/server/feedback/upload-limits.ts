import { isVercel } from "@/utils/environment/env";

/**
 * The host's request-body ceiling, which every feedback upload is subject to
 * because these routes buffer the file in the handler rather than uploading it
 * directly to storage.
 *
 * Vercel caps a Serverless Function's request body at 4.5 MB and offers no way
 * to raise it. The platform rejects the request BEFORE the handler runs, so our
 * own 413 never fires and the reviewer gets a platform error page instead of an
 * actionable message. A configured cap above this line is not a cap, it is dead
 * space — which is why it is clamped rather than trusted.
 */
const VERCEL_REQUEST_BODY_LIMIT_BYTES = Math.floor(4.5 * 1024 * 1024);

function platformCeilingBytes(): number | null {
  return isVercel() ? VERCEL_REQUEST_BODY_LIMIT_BYTES : null;
}

/**
 * Reads a positive-integer limit from the environment, falling back to
 * `defaultValue`. A malformed value is refused and reported rather than
 * coerced — a typo silently becoming 0 or NaN would take the feature down
 * quietly, which is the failure mode worth spending a branch to avoid.
 */
export function readLimit(envName: string, defaultValue: number): number {
  const raw = process.env[envName];
  if (raw === undefined || raw.trim() === "") return defaultValue;

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    console.warn(
      `[upload-limits] ${envName}="${raw}" is not a positive integer; falling back to ${defaultValue}`,
    );
    return defaultValue;
  }
  return parsed;
}

// One line per clamped limit per process, not per request. An operator should
// learn that their configured 50 MB is really 4.5 MB from the boot log, not
// from a reviewer whose upload failed.
const clampWarned = new Set<string>();

/**
 * Clamps a configured cap to what the deployment can actually accept.
 * The configured value is the intent; the platform ceiling is a safety limit,
 * never the source of the number. Self-hosted behind a normal Node server there
 * is no ceiling and the configured value stands as-is.
 *
 * Publish the result to clients (see GET /api/v1/widget/config) rather than
 * letting them hard-code a number: the same code deploys to both a platform
 * with a 4.5 MB ceiling and one without, and only the server knows which.
 */
export function clampToPlatformLimit(
  configuredBytes: number,
  label: string,
): number {
  const ceiling = platformCeilingBytes();
  if (ceiling === null || configuredBytes <= ceiling) return configuredBytes;

  if (!clampWarned.has(label)) {
    clampWarned.add(label);
    console.warn(
      `[upload-limits] ${label} configured at ${configuredBytes} bytes but this platform refuses request bodies above ${ceiling} bytes; the effective cap is ${ceiling}. Uploads between the two would be rejected by the host before this app sees them.`,
    );
  }
  return ceiling;
}
