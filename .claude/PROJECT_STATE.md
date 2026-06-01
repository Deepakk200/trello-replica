## Stack (from package.json)
- Next.js 16.2.6 · React 19.2.4 · TypeScript ^5
- Tailwind CSS ^4 (no config file — uses `@theme inline` in globals.css)
- Zustand 5.0.14 + Immer 11.1.8 + Persist middleware
- @dnd-kit/core 6.3.1 · /sortable 10.0.0 · /utilities 3.2.2
- shadcn 4.8.3 (in `dependencies` — should be `devDependencies`)
- lucide-react 1.17.0 · class-variance-authority · clsx · tailwind-merge
- tw-animate-css · @tailwindcss/postcss (dev) · @base-ui/react (unused)
- nanoid ^5.1.11

## Architecture
- Next.js App Router, `src/` root
- Single route: `src/app/page.tsx` → `<AppShell><BoardView/>`
- All components are `'use client'` — no RSC data fetching
- Two Zustand stores: `boardStore` (persist to `trello-clone-v1`) + `useThemeStore` (persist to `trello-theme`)
- State: normalized flat maps `Record<ID, Entity>` for boards/lists/cards/labels/members/workspaces/templates
- ID generation: `nanoid(8)` via `newId()`
- Persistence: localStorage via `createJSONStorage`; version 8 with `migrate` + `onRehydrateStorage`
- Transient state (not persisted): `filterState`, `notificationsOpen`, `activeCardModalId`, `_hasHydrated`

## Type System (src/types/index.ts)
- `ID = string` · `LabelColor` (10 literals) · `DueFilter` (6 literals) · `BoardVisibility` (3 literals)
- `FilterState { search, labelIds, dueFilter }`
- `Member { id, name, initials, color, email? }`
- `Attachment { id, name, url, type, thumbnail?, addedAt, addedBy }`
- `Notification { id, type(6), cardId?, boardId?, text, createdAt, read }`
- `Workspace { id, name, shortName, color, description, tier(4), memberIds }`
- `BoardTemplate { id, name, description, background, category(5), lists[] }`
- `CardTemplate { id, name, title, description, labelIds, checklistTemplates[] }`
- `Label { id, name, color }` · `ActivityEntry { id, type(7), text, createdAt }`
- `ChecklistItem { id, text, completed, createdAt }` · `Checklist { id, title, items[] }`
- `Card { id, listId, title, description, number, memberIds, attachments, labelIds, dueDate, completed, isArchived, linkedCardIds, checklists, activity, createdAt, updatedAt, cover{type,color?,image?,size,textColor?} }`
- `List { id, boardId, title, cardIds, order, isArchived }`
- `Board { id, title, background, description, listIds, createdAt, memberIds, nextCardNumber, workspaceId, visibility }`
- `BoardState { boards, lists, cards, labels, members, workspaces, activeWorkspaceId, boardTemplates, cardTemplates, activeBoardId, starredBoardIds, recentBoardIds, sidebarCollapsed, activeViewByBoard, notifications, selectedCardIds }`

## Store Actions (src/store/use-board-store.ts)
Boards: `createBoard` `renameBoard` `deleteBoard` `setActiveBoard` `toggleStarBoard` `pushRecentBoard` `updateBoardBackground` `updateBoardDescription` `updateBoardVisibility`
Lists: `createList` `renameList` `deleteList` `reorderLists` `archiveList` `restoreList`
Cards: `createCard` `updateCard` `deleteCard` `moveCard` `reorderCardsInList` `archiveCard` `restoreCard`
Labels: `upsertLabel` `toggleCardLabel`
Members: `addMember` `addMemberToBoard` `toggleCardMember`
Attachments: `addAttachment` `removeAttachment` `setCardCoverFromAttachment`
Workspaces: `createWorkspace` `setActiveWorkspace`
Templates: `createBoardFromTemplate` `createCardFromTemplate` `saveBoardAsTemplate` `saveCardAsTemplate`
Views: `setBoardView(boardId, 'board'|'calendar'|'table'|'dashboard')`
Activity: `pushActivity` `updateCardCover`
Checklists: `createChecklist` `renameChecklist` `deleteChecklist` `addChecklistItem` `toggleChecklistItem` `renameChecklistItem` `deleteChecklistItem`
Links: `linkCards` `unlinkCards`
Bulk: `toggleCardSelection` `clearCardSelection` `bulkArchiveCards` `bulkMoveCards` `bulkAddLabelToCards`
Notifications: `pushNotification` `markNotificationRead` `markAllNotificationsRead` `clearNotifications` `toggleNotificationsDrawer` `closeNotificationsDrawer`
UI: `toggleSidebar` `setFilter`
Modal: `setActiveCardModal` `clearActiveCardModal`
Persistence: `clearAll` (reseeds from `buildSeed()`)
Exports: `useBoardStore<T>(selector)` `useHasHydrated()` `boardStore` (plain)

## Component Inventory
See COMPONENT_MAP.md for full tree.

## Routing
Single page — no multi-route. All navigation is state-driven (active board ID, active view).

## Styling
Tailwind v4 with `@theme inline` in `globals.css`. No `tailwind.config.*`. Dark default; light via `.light` class applied by `ThemeProvider`. Token prefix: `trello-*`. Custom animations: `card-enter`, `list-enter`. Button utilities: `.btn-soft` `.btn-primary` `.btn-ghost`.
**Board background:** rendered via `style={{ background: board.background }}` (inline CSS — works for any gradient/color). No class map in board-view.tsx. Note: sidebar.tsx and board-switcher.tsx still use a BOARD_BG_CLASSES lookup map for the mini board swatch — needs fix in Phase 14.

## External Dependencies (production)
`nanoid@5.1.11`, `zustand@5`, `immer@11`, `@dnd-kit/*`, `lucide-react`, `clsx`, `tailwind-merge`, `class-variance-authority`, `tw-animate-css`, `@base-ui/react` (unused)
