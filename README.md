# Trello Clone

A feature-complete Trello-style board built with Next.js, TypeScript, and dnd-kit.

## Stack

Next.js 16 · React 19 · TypeScript 5 · Tailwind CSS 4 · Zustand 5 + Immer · dnd-kit · shadcn/ui · lucide-react · nanoid

## Features

**Core**
- Multiple boards with gradient / solid-colour backgrounds
- Drag-and-drop lists and cards — mouse and keyboard
- Create, rename, and delete lists
- Create, rename, and delete cards via a full-screen modal
- 10-colour labels with search and custom names
- Due dates with overdue / due-soon visual badges
- Click-to-edit card descriptions
- Activity log: auto-events (created, moved, renamed, labeled, due) + comments
- All data persists automatically to `localStorage`

**Advanced**
- Cross-list card drag with optimistic mid-drag updates
- `DragOverlay` ghost — rotated card tile, translucent list placeholder
- Full focus trap, `Escape`-to-close, and previous-focus restore on modal
- ARIA live announcements for every drag event (screen-reader friendly)
- Hydration skeleton prevents SSR flash
- `React.memo` + narrow Zustand selectors — zero unnecessary re-renders

## Quickstart

```bash
npm install
npm run dev
# open http://localhost:3000
```

## Architecture

```
TopBar ─ board switcher · Settings (clear all) · search
└── AppShell  (40 px bar + calc(100vh-40px) main)
    └── BoardView  (hydration guard, board background)
        ├── BoardHeader  (editable title)
        └── ListsRow
            └── BoardDndContext  (DndContext + DragOverlay)
                └── SortableContext (horizontal, lists)
                    └── ListColumn × N
                        ├── ListHeader  (editable title, menu)
                        ├── SortableContext (vertical, cards)
                        │   └── CardItem × N  (useSortable)
                        │       └── CardModal  (createPortal)
                        │           ├── DescriptionEditor
                        │           ├── ActivitySection
                        │           ├── LabelPopover
                        │           └── DatePopover
                        └── ListFooter  (add-card form)

State
└── use-board-store.ts  (Zustand + immer)
    └── persist middleware → localStorage  key: "trello-clone-v1"
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Enter` | Confirm title rename / submit add-card form |
| `Escape` | Close modal · cancel editable field · cancel drag |
| `Tab` / `Shift+Tab` | Cycle focusable elements; trapped inside open modal |
| `Space` / `Enter` | Begin keyboard drag on a focused card or list handle |
| `Arrow keys` | Move dragged item while keyboard drag is active |

> **Known:** dnd-kit's `KeyboardSensor` intercepts `Enter`/`Space` on cards,
> starting a drag instead of opening the modal. Use `Tab` to reach the pencil
> button as a workaround.

## LocalStorage

Key: **`trello-clone-v1`** (version 1 — bump + add `migrate` logic on schema changes).  
Clear via the Settings icon in the top-right corner, or `localStorage.removeItem('trello-clone-v1')`.
