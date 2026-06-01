# Trello Clone

A production-quality Trello replica built with Next.js 16, React 19, and TypeScript.

## Features

- **Boards** — multiple boards with custom gradient/solid-color backgrounds
- **Lists & Cards** — full CRUD, inline title editing, drag-and-drop reorder and cross-list move
- **Card detail** — description (with `@card` mention linking), labels, due dates, checklists, attachments, members, cover images, activity feed
- **Views** — Board, Calendar, Table, Dashboard per board
- **Sidebar** — workspace switcher, starred/recent boards, collapsible (desktop) / overlay drawer (mobile)
- **Filter bar** — filter cards by search, label, or due-date window
- **Bulk actions** — shift-click to select multiple cards, then move/label/archive
- **Notifications drawer** — activity feed with unread badge
- **Command palette** — `Cmd+K` / `Ctrl+K` fuzzy search across boards and cards
- **Keyboard shortcuts** — `?` opens the shortcuts overlay; full Tab/Enter/Esc keyboard flow
- **Themes** — dark (default) and light mode toggle
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

## Keyboard shortcuts

| Key | Action |
|---|---|
| `?` | Shortcuts overlay |
| `Cmd/Ctrl K` | Command palette |
| `Esc` | Close modal / popover |
| `Enter` / `Space` | Open card (when focused) |
| `Shift + click` | Multi-select cards |
