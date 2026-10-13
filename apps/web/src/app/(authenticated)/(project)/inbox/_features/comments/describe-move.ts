export function describeMove(count: number, toColumnName: string) {
  return count === 1
    ? `Moved to ${toColumnName}`
    : `Moved ${count} items to ${toColumnName}`;
}

// A bulk move records its source only when every card left the same column;
// otherwise "from" would be a guess.
export function sharedSourceColumn(sources: (string | null)[]): string | null {
  const [first] = sources;
  if (!first) return null;
  return sources.every((s) => s === first) ? first : null;
}
