# Trello Clone — Handoff

## Stack
Next.js 16.2.6 · React 19.2.4 · TypeScript 5.9.3 · Tailwind CSS 4.3.0 · Zustand 5.0.14 · Immer 11.1.8 · @dnd-kit/{core 6.3.1, sortable 10.0.0, utilities 3.2.2} · shadcn 4.8.3 · lucide-react 1.17.0

## Folder Tree (`src/`, depth 3)
```
src/
├── app/
│   ├── globals.css          # Tailwind v4 @theme tokens, scrollbar, :focus-visible
│   ├── layout.tsx           # RootLayout, Inter, dark body
│   └── page.tsx             # Mounts <AppShell><BoardView/>
├── components/
│   ├── board/
│   │   ├── add-list-button.tsx
│   │   ├── board-header.tsx
│   │   ├── board-view.tsx
│   │   ├── dnd-context.tsx
│   │   └── lists-row.tsx
│   ├── card/
│   │   ├── activity-section.tsx
│   │   ├── card-badges.tsx
│   │   ├── card-item.tsx
│   │   ├── card-modal.tsx
│   │   ├── date-popover.tsx
│   │   ├── description-editor.tsx
│   │   └── label-popover.tsx
│   ├── list/
│   │   ├── list-column.tsx
│   │   ├── list-footer.tsx
│   │   ├── list-header.tsx
│   │   └── list-menu.tsx
│   └── ui/
│       ├── app-shell.tsx
│       ├── board-switcher.tsx
│       ├── button.tsx        # shadcn primitive
│       └── top-bar.tsx
├── lib/utils.ts              # shadcn cn() helper
├── store/use-board-store.ts
└── types/index.ts
```

## Store Action Signatures
```ts
// boards
createBoard(title: string, background: string): ID
renameBoard(id: ID, title: string): void
deleteBoard(id: ID): void
setActiveBoard(id: ID): void
// lists
createList(boardId: ID, title: string): ID
renameList(id: ID, title: string): void
deleteList(id: ID): void
reorderLists(boardId: ID, orderedIds: ID[]): void
// cards
createCard(listId: ID, title: string): ID
updateCard(id: ID, patch: Partial<Pick<Card,'title'|'description'|'dueDate'|'completed'|'labelIds'>>): void
deleteCard(id: ID): void
moveCard(cardId: ID, toListId: ID, toIndex: number): void
reorderCardsInList(listId: ID, orderedIds: ID[]): void
// labels
upsertLabel(label: Label): void
toggleCardLabel(cardId: ID, labelId: ID): void
// activity
pushActivity(cardId: ID, entry: Omit<ActivityEntry,'id'|'createdAt'>): void
// persistence
clearAll(): void
// exports: useBoardStore<T>(selector), useHasHydrated(), boardStore (plain)
```

## Component Inventory
| Path | Purpose |
|---|---|
| `board/board-view.tsx` | Resolves active board; renders BoardHeader + ListsRow; hydration skeleton |
| `board/board-header.tsx` | Editable board title, Star / Users / Share |
| `board/lists-row.tsx` | Wraps lists in BoardDndContext + horizontal SortableContext |
| `board/dnd-context.tsx` | PointerSensor (d=6) + KeyboardSensor; cross-list optimistic move; DragOverlay; a11y announcements |
| `board/add-list-button.tsx` | Collapsed pill ↔ expanded form; creates list on Enter |
| `list/list-column.tsx` | Memoised sortable column; vertical SortableContext; owns `addingCard` state |
| `list/list-header.tsx` | Editable title + MoreHorizontal menu trigger with outside-click guard |
| `list/list-menu.tsx` | Dropdown: Add card + Delete (functional); Copy/Move/Sort (visual stubs) |
| `list/list-footer.tsx` | "+ Add a card" ↔ autosize textarea; Enter keeps form open (Trello behaviour) |
| `card/card-item.tsx` | Memoised sortable card; label pills; CardBadges; pencil edit; mounts CardModal |
| `card/card-badges.tsx` | Due-date badge (overdue/soon/completed/normal), description icon, comment count |
| `card/card-modal.tsx` | Portal dialog; focus trap + restore; `aria-labelledby`; 2-col md+ layout |
| `card/description-editor.tsx` | Click-to-edit description; Save/Cancel |
| `card/activity-section.tsx` | Comment composer + reversed activity feed; custom `timeAgo` (no date-fns) |
| `card/label-popover.tsx` | Search, toggle labels, create with color-swatch grid |
| `card/date-popover.tsx` | Date + optional time; Save / Remove / Cancel |
| `ui/app-shell.tsx` | TopBar + `<main h-[calc(100vh-40px)]>` |
| `ui/top-bar.tsx` | 40px bar: logo, BoardSwitcher, search, Bell/Info/Settings(clearAll), avatar |
| `ui/board-switcher.tsx` | Popover: list + switch boards; create with 4-gradient + 2-solid swatches |

## Phases
**Completed (1–13):**
1. Type system 2. Zustand store + seed 3. App shell 4. Board canvas + switcher
5. ListColumn 6. CardItem + CardBadges 7. dnd-kit drag-and-drop
8. Card modal (description, activity, labels, dates) 9. Persistence hardening
10. Trello visual polish (Tailwind v4 @theme, 272px lists, shadow-card tokens)
11. Micro-polish (board backgrounds, board-header opacity, amber WCAG fix)
12. Render optimisation (React.memo, useShallow, narrow selectors)
13. Accessibility (ARIA, focus trap, Tab cycle, focus-visible, dnd announcements)

**Pending:**
- **14** — Code quality: ESLint clean pass, remove eslint-disable comments, extract shared colour maps to `src/lib/colors.ts`, add error boundaries
- **15** — Final review + README (setup, features, architecture, deploy)

## Known Issues / TODOs (phases 11–13)
- **`nanoid` missing from `package.json`** — run `npm install nanoid` (used in store + label-popover). `date-fns` was planned but replaced by a custom `timeAgo`; skip unless needed.
- **Keyboard drag vs. modal open** — dnd-kit KeyboardSensor intercepts Enter/Space on cards, starting a drag instead of opening the modal. Keyboard users must Tab to the pencil button. Fix: custom sensor activation key or `onKeyDown` composition in card-item.
- **Skip-to-board link missing** — specified in phase 13 but not wired. Add `<a href="#board-main">` (sr-only) in TopBar and `id="board-main"` on `<main>` in app-shell.
- **ListMenu stubs** — "Copy list", "Move all cards", "Sort by…" are no-ops.
- **`useEffect` lint suppression** — `card-modal.tsx:42` has `eslint-disable-line react-hooks/exhaustive-deps` on title-sync effect; should be rewritten with `useRef` comparison.
- **`@base-ui/react`** — auto-installed by shadcn; currently unused. Safe to remove.
- **`shadcn` in `dependencies`** — move to `devDependencies`.
- **Next.js 16** — `create-next-app@latest` installed v16 (not requested v15). AGENTS.md warns of breaking API changes; check `node_modules/next/dist/docs/` if unexpected behaviour occurs.
- **2 moderate PostCSS CVEs** — in Next.js's internal deps; the npm-suggested fix downgrades to Next 9. Monitor for upstream patch.
