type BoardColumn = { id: string; name: string; category: string };

export const ARCHIVED_COLUMN_NAME = "Archived";

// Server twin of the board's getBoardColumnId (ADR-0010): a null or stale
// columnId lands the card in the first column, by position, of its status
// category. Columns must arrive sorted by position. Archived → null.
export function resolveBoardColumn<T extends BoardColumn>(
  columns: T[],
  feedback: { columnId: string | null; status: string },
): T | null {
  const pinned = columns.find(
    (c) => c.id === feedback.columnId && c.category === feedback.status,
  );
  return pinned ?? columns.find((c) => c.category === feedback.status) ?? null;
}

// Agents address columns by what they read on the board, so names match
// case-insensitively; ids still work for callers that listed columns first.
export function findColumnByReference<T extends BoardColumn>(
  columns: T[],
  reference: string,
): T | null {
  const byId = columns.find((c) => c.id === reference);
  if (byId) return byId;
  const wanted = reference.trim().toLowerCase();
  return columns.find((c) => c.name.trim().toLowerCase() === wanted) ?? null;
}

// The name a status change lands on, for a comment's "to": a status write
// always resets to the first column of the category.
export function transitionTargetName(
  columns: BoardColumn[],
  status: string,
): string | null {
  if (status === "closed") return ARCHIVED_COLUMN_NAME;
  return columns.find((c) => c.category === status)?.name ?? null;
}

export function boardColumnName(
  columns: BoardColumn[],
  feedback: { columnId: string | null; status: string },
): string | null {
  if (feedback.status === "closed") return ARCHIVED_COLUMN_NAME;
  return resolveBoardColumn(columns, feedback)?.name ?? null;
}
