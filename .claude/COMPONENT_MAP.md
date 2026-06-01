## Layout Shell
AppShell (ui/app-shell.tsx) → uses: [] → renders: [TopBar, Sidebar, main>children]
TopBar (ui/top-bar.tsx) → uses: [notifications.unreadCount, useThemeStore.theme] → renders: [BoardSwitcher, search input, bell button, theme toggle, settings/clearAll, avatar]
Sidebar (ui/sidebar.tsx) → uses: [boards, activeBoardId, starredBoardIds, recentBoardIds, sidebarCollapsed, activeWorkspaceId] → renders: [WorkspaceSwitcher, nav links, starred/recent/all boards (filtered by workspace), TemplatesGallery]; NOTE: still uses BOARD_BG_CLASSES map for mini swatches
WorkspaceSwitcher (ui/workspace-switcher.tsx) → uses: [workspaces, activeWorkspaceId] → renders: workspace selector popover
BoardSwitcher (ui/board-switcher.tsx) → uses: [boards, activeBoardId] → renders: popover list of boards + create form; NOTE: still uses BOARD_BG_CLASSES map for mini swatches

## Board Layer
BoardView (board/board-view.tsx) → uses: [activeBoardId, activeCardModalId, activeViewByBoard] → renders: [ShortcutsOverlay, CommandPalette, NotificationsDrawer, BulkActionBar, BoardHeader, ViewSwitcher, FilterBar(shrink-0), lists-scroll-zone(flex-1 overflow-x-auto) | CalendarView | TableView | DashboardView, CardModal]
  Layout: flex-col; background via `style={{ background: board.background }}` (inline — any CSS value); FilterBar is a fixed shrink-0 strip above the horizontal scroll zone; other views each get their own flex-1 wrapper
BoardHeader (board/board-header.tsx) → uses: [board.title, board.visibility, board.memberIds] → renders: editable title, star button, member avatars, share/visibility controls, BoardMenu trigger
ViewSwitcher (board/view-switcher.tsx) → uses: [activeViewByBoard[boardId]] → renders: Board/Calendar/Table/Dashboard tabs
FilterBar (board/filter-bar.tsx) → uses: [filterState, labels] → renders: Filter button + popover (search/labels/due); boardId param currently unused (void)
BulkActionBar (board/bulk-action-bar.tsx) → uses: [selectedCardIds, lists, labels] → renders: fixed bottom bar with Move/Label/Archive/Clear
BoardMenu (board/board-menu.tsx) → uses: [board.*] → renders: side panel with background/description/visibility/archive
TemplatesGallery (board/templates-gallery.tsx) → uses: [boardTemplates, workspaces] → renders: modal grid of board templates
VisibilityBadge (board/visibility-badge.tsx) → uses: [board.visibility] → renders: badge chip

## Views
ListsRow (board/lists-row.tsx) → uses: [board.listIds, lists] → renders: [BoardDndContext > SortableContext > ListColumn[], AddListButton]; inner div: flex flex-row gap-3 items-start h-full pb-3
DndContext (board/dnd-context.tsx) → uses: [cards, lists] → renders: PointerSensor(distance:6)+KeyboardSensor DnD wrapper + DragOverlay
AddListButton (board/add-list-button.tsx) → uses: [] → renders: collapsed pill (w-[272px] h-11 bg-white/20) ↔ expanded form (bg-trello-listBg, input+button use trello tokens)
CalendarView (board/calendar-view.tsx) → uses: [boards[boardId].listIds → cards] → renders: monthly grid, cards by due date; TECH DEBT: uses local useState<ID|null> for CardModal instead of store
TableView (board/table-view.tsx) → uses: [all cards in board] → renders: sortable table; TECH DEBT: uses local useState<ID|null> for CardModal instead of store
DashboardView (board/dashboard-view.tsx) → uses: [all cards in board, labels, members] → renders: stat widgets (completion, label dist, member load)

## List
ListColumn (list/list-column.tsx) → uses: [list, cards, filterState] → renders: [drag-handle>ListHeader, SortableContext>CardItems(hidden-by-filter), ListFooter]; dimensions: w-[272px] shrink-0 max-h-[calc(100vh-120px)]
ListHeader (list/list-header.tsx) → uses: [list.title] → renders: editable h2 (click→input with bg-trello-surfaceRaised ring-trello-accent), MoreHorizontal→ListMenu; outside-click guard on menu container ref
ListMenu (list/list-menu.tsx) → uses: [list] → renders: dropdown (bg-trello-surfaceRaised border-trello-border); "Add card" + "Delete list" functional; "Copy/Move/Sort" are visual stubs
ListFooter (list/list-footer.tsx) → uses: [] → renders: "+ Add a card" button ↔ autosize textarea (bg-trello-cardBg ring-trello-accent) + "Add card" (bg-trello-primary) + X; Enter submits, keeps form open; supports CardTemplatePicker

## Card
CardItem (card/card-item.tsx) → uses: [card, labels, members] → renders: cover, label pills, title, CardBadges, member avatars, pencil→QuickEditPopover; opens CardModal via setActiveCardModal on click
CardBadges (card/card-badges.tsx) → uses: [card.dueDate, card.completed, card.checklists, card.attachments] → renders: due badge, description icon, checklist progress, attachment count
CardModal (card/card-modal.tsx) → uses: [card, list, board, labels, members] → renders: portal dialog with title, DescriptionEditor, ChecklistSection, AttachmentsSection, LinkedCardsSection, ActivitySection, LabelPopover, DatePopover, MembersPopover, CoverPopover, CardTemplatePicker; TECH DEBT: eslint-disable on title-sync effect:42
DescriptionEditor (card/description-editor.tsx) → uses: [card.description] → renders: click-to-edit textarea
ActivitySection (card/activity-section.tsx) → uses: [card.activity] → renders: comment composer + reversed activity feed; TECH DEBT: duplicates timeAgo helper
LabelPopover (card/label-popover.tsx) → uses: [labels, card.labelIds] → renders: search + toggle + create labels; TECH DEBT: duplicates label color map
DatePopover (card/date-popover.tsx) → uses: [card.dueDate, card.completed] → renders: date+time input, Save/Remove/Cancel
MembersPopover (card/members-popover.tsx) → uses: [board.memberIds, card.memberIds, members] → renders: toggle members on/off card
CoverPopover (card/cover-popover.tsx) → uses: [card.cover, card.attachments] → renders: color swatches + image URL + size toggle
ChecklistSection (card/checklist-section.tsx) → uses: [card.checklists] → renders: progress bar, CRUD checklist items
AttachmentsSection (card/attachments-section.tsx) → uses: [card.attachments] → renders: list + add form + set-cover button
LinkedCardsSection (card/linked-cards-section.tsx) → uses: [card.linkedCardIds, cards] → renders: linked card list + add via search
QuickEditPopover (card/quick-edit-popover.tsx) → uses: [card, labels, lists] → renders: inline edit (title, labels, due, move, archive)
CardTemplatePicker (card/card-template-picker.tsx) → uses: [cardTemplates] → renders: template selector in ListFooter

## UI Utilities
NotificationsDrawer (ui/notifications-drawer.tsx) → uses: [notificationsOpen, notifications] → renders: createPortal right-side drawer (w-95), all/unread tabs; TECH DEBT: duplicates timeAgo helper
CommandPalette (ui/command-palette.tsx) → uses: [boards, cards, lists, activeBoardId] → renders: createPortal Cmd+K modal (w-160), grouped search results; opened by Ctrl/Cmd+K
ShortcutsOverlay (ui/shortcuts-overlay.tsx) → uses: [] → renders: ? key modal with keyboard shortcuts
ThemeProvider (ui/theme-provider.tsx) → uses: [useThemeStore.theme] → renders: children; applies .dark/.light class to document.documentElement
MemberAvatar (ui/member-avatar.tsx) → uses: [member] → renders: colored circle with initials + gradient background
Button (ui/button.tsx) → shadcn primitive with CVA variants
