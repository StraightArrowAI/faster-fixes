/**
 * Reads the recording length the widget self-reported at upload time out of the
 * Asset's `metadata` escape hatch. Returns null for every asset that predates
 * the field, for a screenshot, and for anything malformed — callers must treat
 * a missing duration as normal, not as an error.
 */
export function readRecordingDurationMs(metadata: unknown): number | null {
  if (
    metadata === null ||
    typeof metadata !== "object" ||
    Array.isArray(metadata)
  ) {
    return null;
  }
  const value = (metadata as Record<string, unknown>).durationMs;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
