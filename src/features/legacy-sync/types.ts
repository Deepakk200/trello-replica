import type { BoardState } from '@/types';

/**
 * The slice of the legacy Zustand store that is persisted to Postgres in
 * sub-phase 1c. Only the real board *data* is round-tripped through the DB —
 * the client-only seed/UI slices (members roster, workspaces grouping,
 * templates, notifications, inboxCards, starred/recent, panel + calendar prefs)
 * remain in localStorage. See `legacy-sync/actions.ts` for the mapping.
 */
export type LegacySnapshot = Pick<BoardState, 'boards' | 'lists' | 'cards' | 'labels'>;
