import { clampToPlatformLimit, readLimit } from "./upload-limits";

/**
 * Bounds for the screen recording a Feedback may carry.
 *
 * DURATION IS THE PRIMARY CONTROL. A 30-second bound is what keeps the byte
 * size small enough to travel through a request body at all; the byte cap is a
 * backstop for a pathological encoder, not the mechanism. See
 * docs/adr/0009-feedback-screen-recording.md for the arithmetic.
 */

/** Base MIME types accepted. WebM covers Chrome/Firefox/Edge; MP4 covers Safari,
 *  whose MediaRecorder emits H.264/AAC in an MP4 container and nothing else.
 *  Validation compares the base type, so "video/webm;codecs=vp9" is accepted. */
export const ALLOWED_RECORDING_TYPES = ["video/webm", "video/mp4"];

/**
 * Codec preference, best-compression-first. The widget walks this list with
 * `MediaRecorder.isTypeSupported()` and uses the first hit — never hardcoding
 * one, because Safari supports none of the WebM entries and Chrome's support
 * shifts between versions. VP9 leads because screen content is mostly static UI
 * with small frame-to-frame deltas, which is what it compresses best.
 * Verified supported in Chrome 151: vp9, vp8, av01, and mp4/avc1.
 */
export const PREFERRED_RECORDING_TYPES = [
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/mp4",
];

/**
 * Encoding guidance published to the widget so the client codes against the
 * server's numbers instead of inventing its own.
 *
 * 600 kbps and 12 fps are tuned for screen capture, not video: a UI recording is
 * long stretches of identical pixels punctuated by small changes, so dropping
 * the frame rate cuts size far more than lowering the bitrate does. At these
 * settings 30 seconds is ~2.2 MB.
 */
export const RECOMMENDED_RECORDING_ENCODING = {
  videoBitsPerSecond: 600_000,
  /** Request via getDisplayMedia({ video: { frameRate } }). */
  frameRate: 12,
};

/**
 * 30 seconds by default. This is the number that makes the size problem go
 * away: it bounds the artifact at the source rather than rejecting it after the
 * reviewer has already spent the effort recording it.
 * Override with FEEDBACK_RECORDING_MAX_DURATION_MS.
 */
export function maxRecordingDurationMs(): number {
  return readLimit("FEEDBACK_RECORDING_MAX_DURATION_MS", 30_000);
}

/**
 * 8 MB by default — a backstop, not a target. The expected artifact is ~2.2 MB
 * (30s at 600 kbps); 8 MB still admits a pathological case such as a busy
 * screen falling back to VP8 at ~2 Mbps. Override with
 * FEEDBACK_RECORDING_MAX_BYTES; a self-hoster who sets 50 MB gets 50 MB.
 */
export function configuredMaxRecordingBytes(): number {
  return readLimit("FEEDBACK_RECORDING_MAX_BYTES", 8 * 1024 * 1024);
}

/**
 * What the server will actually accept: the configured cap, clamped down to the
 * host's request-body ceiling where one exists. Advertised through
 * GET /api/v1/widget/config so a reviewer is told the real bound before
 * recording rather than after.
 */
export function effectiveMaxRecordingBytes(): number {
  return clampToPlatformLimit(
    configuredMaxRecordingBytes(),
    "FEEDBACK_RECORDING_MAX_BYTES",
  );
}

export function recordingExtension(baseMimeType: string): string {
  return baseMimeType === "video/mp4" ? "mp4" : "webm";
}
