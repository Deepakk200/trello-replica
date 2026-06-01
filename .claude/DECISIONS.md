## Architectural Decisions

DECISION: Normalized flat state (Record<ID, Entity> for boards/lists/cards) — REASON: Enables O(1) card/list lookup by ID, essential for DnD moves and cross-reference (linkedCardIds, memberIds). Avoids nested mutation complexity. — DATE: 2026-05-31

DECISION: All components are 'use client' — no server components — REASON: App is 100% client-side with localStorage persistence; no server data fetching needed. Avoids RSC/hydration split complexity. — DATE: 2026-05-31

DECISION: Zustand + Immer over Redux/Context — REASON: Minimal boilerplate; Immer gives safe mutation syntax inside `set()`; Zustand persists easily. Scales to 70+ actions without ceremony. — DATE: 2026-05-31

DECISION: Two separate stores (boardStore + useThemeStore) — REASON: Theme is independent concern with different persistence key; separating avoids unnecessary re-renders when theme toggles. — DATE: 2026-05-31

DECISION: nanoid(8) for IDs — REASON: Short, URL-safe, collision-resistant for client-only use. No UUID overhead. — DATE: 2026-05-31

DECISION: localStorage persistence via Zustand persist middleware — REASON: Zero-backend prototype; seed data auto-injects on first load via `onRehydrateStorage`. Version-based migration with `migrate()` handles schema evolution. — DATE: 2026-05-31

DECISION: Tailwind v4 with @theme inline tokens (no tailwind.config.*) — REASON: v4 uses CSS-native config; all design tokens live in globals.css under `@theme inline`, enabling CSS-var-backed dark/light switching. — DATE: 2026-05-31

DECISION: CSS var theming (dark default via :root, light via .light class on <html>) — REASON: Single source of truth for color tokens; ThemeProvider applies class to document.documentElement. Matches Tailwind v4 @custom-variant dark pattern. — DATE: 2026-05-31

DECISION: activeCardModalId in Zustand store (not local state) — REASON: CardModal must be openable from multiple places (NotificationsDrawer, CommandPalette, TableView, CalendarView, card clicks). Centralizing avoids prop-drilling and enables deep-link-like behavior. — DATE: 2026-05-31

DECISION: selectedCardIds in store for bulk operations — REASON: BulkActionBar is a sibling of BoardView in the tree; needs to read and clear selection without prop threading. — DATE: 2026-05-31

DECISION: Board views (board/calendar/table/dashboard) stored per-board in activeViewByBoard map — REASON: Each board should remember its last view independently. Persisted to localStorage. — DATE: 2026-05-31

DECISION: Transient state (filterState, notificationsOpen, activeCardModalId) excluded from persist via `partialize` — REASON: These should reset on page load; persisting them would cause stale UI state (open modals, stale filters). — DATE: 2026-05-31

DECISION: DnD via @dnd-kit (PointerSensor d=6 + KeyboardSensor) — REASON: React-native DnD lib with first-class sortable support and ARIA announcements. Distance=6 prevents accidental drags on card clicks. — DATE: 2026-05-31

DECISION: Custom timeAgo helper instead of date-fns — REASON: date-fns was removed to avoid bundle weight; simple relative time formatting is sufficient. (Note: currently duplicated — see TECH_DEBT.md) — DATE: 2026-05-31
