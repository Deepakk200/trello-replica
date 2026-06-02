# Trello Clone

A production-quality Trello replica built with Next.js 16, React 19, and TypeScript.

## Features

- **Boards** — multiple boards with custom gradient/solid-color backgrounds; deep **copy board**
- **Lists** — full CRUD, drag-and-drop reorder, **collapse to a vertical bar**, full Trello-style actions menu (copy, move-to-position, move all cards, sort, watch, archive), per-header active-card count
- **Cards** — full CRUD, drag-and-drop with drop indicator, **move with explicit position picker**, copy, quick-edit (right-click), label strips that **click-to-expand board-wide**
- **Card detail** — description, labels, due dates, checklists (with completion celebration), URL **+ file (base64) attachments**, members, **image covers**, activity feed
- **Views** — Board, Calendar, Table, Dashboard, switched from a floating **bottom navigation pill** (keys `1`–`4`)
- **Sidebar** — workspace switcher, starred/recent boards; collapses to an **icon strip** on desktop / overlay drawer on mobile
- **Filter bar** — filter cards by search, label, or due-date window
- **Bulk actions** — shift-click to select multiple cards, then move/label/archive
- **Notifications drawer** — activity feed with unread badge
- **Command palette** — `Cmd+K` / `Ctrl+K` fuzzy search across boards and cards
- **Mobile** — full-width snap lists with a **carousel dot indicator**, bottom-sheet popovers, fullscreen card modal
- **Keyboard shortcuts** — `?` opens the shortcuts overlay; full Tab/Enter/Esc keyboard flow
- **Themes** — dark (default) and light mode toggle, WCAG AA contrast
- **Persistence** — localStorage via Zustand persist; survives page refresh

## Stack

| Layer | Library |
|---|---|
| Framework | Next.js 16 (App Router, all `use client`) |
| UI | React 19, Tailwind CSS v4, shadcn |
| State | Zustand 5 + Immer 11 |
| Drag-and-drop | @dnd-kit/core + /sortable |
| Icons | lucide-react |

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm run start      # serve production build
```

## Architecture

- **Single route** — `src/app/page.tsx` → `AppShell` → `BoardView`
- **Flat normalized state** — `Record<ID, Entity>` maps; no nested objects
- **Narrow selectors** — `useBoardStore(s => s.cards[id])` + `useShallow` for arrays prevent over-rendering
- **Performance** — `React.memo` on `CardItem`/`ListColumn`; `next/dynamic` lazy-loads `CardModal`; CSS `contain: layout style` on list columns
- **Error boundaries** — wrap `BoardView` and `CardModal` independently
- **Shared utilities** — label colour maps in `src/lib/colors.ts`, date helpers in `src/lib/time.ts` (single source of truth, no duplication)

## Keyboard shortcuts

| Key | Action |
|---|---|
| `?` | Shortcuts overlay |
| `Cmd/Ctrl K` | Command palette |
| `1` / `2` / `3` / `4` | Switch Board / Calendar / Table / Dashboard view |
| `Esc` | Close modal / popover |
| `Enter` / `Space` | Open card (when focused) |
| `Shift + click` | Multi-select cards |
