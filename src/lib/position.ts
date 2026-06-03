// Fractional indexing for drag-and-drop ordering.
// Positions are Float values spaced 65536 apart initially.
// Moving an item inserts it at the midpoint of its neighbours —
// only ONE row changes in the database per drag. No sibling reorder.

const GAP = 65536;

export function initialPosition(): number {
  return GAP;
}

export function positionBetween(
  before: number | null,
  after: number | null
): number {
  if (before === null && after === null) return GAP;
  if (before === null) return (after as number) / 2;
  if (after === null) return before + GAP;
  return (before + after) / 2;
}

export function recomputePositions(count: number): number[] {
  return Array.from({ length: count }, (_, i) => (i + 1) * GAP);
}
