import { clampToPlatformLimit, readLimit } from "./upload-limits";

/** Unchanged from the original inline constant. */
export const ALLOWED_SCREENSHOT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
];

/**
 * 5 MB by default, unchanged for self-hosted deployments. Override with
 * FEEDBACK_SCREENSHOT_MAX_BYTES.
 */
export function configuredMaxScreenshotBytes(): number {
  return readLimit("FEEDBACK_SCREENSHOT_MAX_BYTES", 5 * 1024 * 1024);
}

/**
 * What the server will actually accept.
 *
 * On Vercel the top 0.5 MB of the 5 MB default was always unreachable: the
 * platform refuses the request at 4.5 MB before the route runs, so a reviewer on
 * a hi-DPI display whose PNG landed between the two limits got a platform error
 * page rather than the route's 413. This is what the routes enforce and what
 * GET /api/v1/widget/config publishes, so the widget can downscale or refuse
 * before spending the upload instead of after.
 */
export function effectiveMaxScreenshotBytes(): number {
  return clampToPlatformLimit(
    configuredMaxScreenshotBytes(),
    "FEEDBACK_SCREENSHOT_MAX_BYTES",
  );
}
