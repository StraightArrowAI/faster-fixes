import type { GetFeedbackColumnsOutput } from "@/app/(authenticated)/(project)/settings/_features/board-columns/get-feedback-columns.trpc.query";

// Mirrors the server rule (ADR-0010): a null or stale columnId lands the card in
// the first column, by position, of its status category. Columns arrive sorted.
export function getBoardColumnId(
  feedback: { columnId: string | null; status: string },
  columns: GetFeedbackColumnsOutput,
): string | null {
  const pinned = columns.find(
    (c) => c.id === feedback.columnId && c.category === feedback.status,
  );
  if (pinned) return pinned.id;
  return columns.find((c) => c.category === feedback.status)?.id ?? null;
}
