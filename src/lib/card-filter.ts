import type { FilterState, ID } from '@/types';

/**
 * Shared board-filter logic (used by the list columns + anywhere else that needs
 * to honour the active board filter). Trello semantics: within a dimension = OR
 * (any of the selected labels/members), across dimensions = AND.
 */

/** Minimal card shape the matcher needs — works for store cards. */
export interface FilterableCard {
  title: string;
  labelIds: ID[];
  memberIds: ID[];
  dueDate: string | null;
  completed: boolean;
}

/** True when at least one filter dimension is set (so the active bar should show). */
export function isFilterActive(f: FilterState): boolean {
  return (
    f.search.trim().length > 0 ||
    f.labelIds.length > 0 ||
    f.memberIds.length > 0 ||
    f.dueFilter !== '' ||
    f.complete !== ''
  );
}

/** Number of active dimensions (for the "Filters (n)" badge). */
export function activeFilterCount(f: FilterState): number {
  return (
    (f.search.trim() ? 1 : 0) +
    f.labelIds.length +
    f.memberIds.length +
    (f.dueFilter ? 1 : 0) +
    (f.complete ? 1 : 0)
  );
}

/** True when the card passes ALL active dimensions (AND across, OR within). */
export function cardMatchesFilter(card: FilterableCard, f: FilterState, now: number = Date.now()): boolean {
  if (f.search.trim() && !card.title.toLowerCase().includes(f.search.trim().toLowerCase())) return false;

  if (f.labelIds.length > 0 && !f.labelIds.some((id) => card.labelIds.includes(id))) return false;

  if (f.memberIds.length > 0 && !f.memberIds.some((id) => card.memberIds.includes(id))) return false;

  if (f.complete === 'complete' && !card.completed) return false;
  if (f.complete === 'incomplete' && card.completed) return false;

  switch (f.dueFilter) {
    case 'none':
      if (card.dueDate) return false;
      break;
    case 'overdue':
      if (!(card.dueDate && !card.completed && new Date(card.dueDate).getTime() < now)) return false;
      break;
    case 'next24h': {
      if (!card.dueDate) return false;
      const t = new Date(card.dueDate).getTime();
      if (!(t >= now && t <= now + 86_400_000)) return false;
      break;
    }
    case 'nextweek': {
      if (!card.dueDate) return false;
      const t = new Date(card.dueDate).getTime();
      if (!(t >= now && t <= now + 7 * 86_400_000)) return false;
      break;
    }
    case 'complete': // legacy value kept for back-compat
      if (!card.completed) return false;
      break;
    case '':
    default:
      break;
  }
  return true;
}
