## Resolved

- `nanoid` missing from package.json — RESOLVED 2026-05-31
- `eslint-disable-line react-hooks/exhaustive-deps` in card-modal.tsx — RESOLVED 2026-06-01 (prevTitleRef)
- `eslint-disable-line` in theme-provider.tsx — RESOLVED 2026-06-01 (setTheme in deps)
- No error boundaries — RESOLVED 2026-06-01 (ErrorBoundary wraps BoardView + CardModal)
- Keyboard Enter/Space on cards starts DnD drag — RESOLVED 2026-06-01 (onKeyDown override)
- Skip-to-board a11y link missing — RESOLVED 2026-06-01 (app-shell.tsx)
- BOARD_BG_CLASSES hardcoded map — RESOLVED 2026-06-01 (inline style everywhere)
- Hardcoded hex in UI components — RESOLVED 2026-06-01 (zero hex; only in data arrays)
- No metadata/viewport/manifest — RESOLVED 2026-06-01 (layout.tsx, manifest.json, favicon.svg)
- No security headers — RESOLVED 2026-06-01 (next.config.ts)
- Dead `button.tsx` (unused shadcn leftover, `@base-ui/react` import, missing 'use client') — RESOLVED 2026-06-01 (deleted)
- `key={i}` on calendar cells in calendar-view.tsx — RESOLVED 2026-06-01 (changed to `key={dateKey}`)

## Open — Low severity (not blocking production)

ISSUE: CalendarView and TableView use local `useState<ID|null>` for CardModal — FILE: calendar-view.tsx, table-view.tsx
  Fix: replace with store `setActiveCardModal` / `activeCardModalId`

ISSUE: `timeAgo` function duplicated — FILE: activity-section.tsx, notifications-drawer.tsx
  Fix: extract to `src/lib/time.ts`

ISSUE: Label color maps (LABEL_VAR / LABEL_BG / etc.) duplicated across 5+ files
  Fix: extract to `src/lib/colors.ts`

ISSUE: `@/lib/utils` exports `cn()` which is only used by the now-deleted button.tsx; the file itself is otherwise unused
  Fix: delete `src/lib/utils.ts` if shadcn components remain unused, OR keep it for future shadcn integration

ISSUE: ListMenu "Copy list", "Move all cards", "Sort by…" are no-ops — FILE: list-menu.tsx
  Fix: implement or remove stubs

ISSUE: `@base-ui/react` still in package.json (auto-installed by shadcn, now unused)
  Fix: `npm uninstall @base-ui/react`

ISSUE: `shadcn` in `dependencies` instead of `devDependencies`
  Fix: `npm pkg set devDependencies.shadcn=$(npm pkg get dependencies.shadcn) && npm pkg delete dependencies.shadcn`

ISSUE: 2 moderate PostCSS CVEs in Next.js internal deps (no user fix; npm fix downgrades to Next 9)
  Note: monitor upstream for patch

ISSUE: Popovers (Label, Date, Members, Cover) use fixed widths on mobile — may clip on 320px
  Fix: convert to bottom-sheets on mobile (defer)

## Severity legend
High — blocks build, data loss, broken auth, security hole
Med — breaks a user flow or causes visible errors
Low — code quality, tech debt, minor UX
