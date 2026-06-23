export type ID = string;
export type LabelColor = 'green'|'yellow'|'orange'|'red'|'purple'|'blue'|'sky'|'lime'|'pink'|'black';
export type DueFilter = ''|'none'|'overdue'|'next24h'|'nextweek'|'complete';
export type CompleteFilter = '' | 'complete' | 'incomplete';
export type FilterMode = 'dim' | 'hide';
export type BoardVisibility = 'private' | 'workspace' | 'public';
/**
 * Board filter. Within a dimension = OR (any label / any member); across
 * dimensions = AND (Trello semantics). `mode` toggles dim-vs-hide for
 * non-matching cards. Transient (not persisted) — saved sets live in `savedFilters`.
 */
export interface FilterState {
  search: string;
  labelIds: ID[];
  memberIds: ID[];
  dueFilter: DueFilter;
  complete: CompleteFilter;
  mode: FilterMode;
}
/** A named, persisted filter set (per board). `mode` is excluded — it's a view pref. */
export interface SavedFilter {
  id: ID;
  name: string;
  filter: Pick<FilterState, 'search' | 'labelIds' | 'memberIds' | 'dueFilter' | 'complete'>;
}

/** Board view surfaces. `timeline` is the Gantt view; `map` plots located cards. */
export type BoardViewKind = 'board' | 'calendar' | 'table' | 'dashboard' | 'timeline' | 'map';

/** A card's optional location for the Map view. */
export interface CardLocation { address: string; lat?: number; lng?: number }

export type PanelKey = 'inbox' | 'planner' | 'board';
export interface PanelLayout {
  inboxWidth: number;       // px when expanded
  plannerWidth: number;     // px when expanded
  inboxCollapsed: boolean;
  plannerCollapsed: boolean;
  boardCollapsed: boolean;
}

export interface Member {
  id: ID; name: string; initials: string;
  color: string;
  email?: string;
}
export interface Attachment {
  id: ID; name: string; url: string;
  type: 'link' | 'image' | 'file';
  thumbnail?: string;
  addedAt: string; addedBy: ID;
}
export interface Notification {
  id: ID;
  type: 'mention' | 'due_soon' | 'overdue' | 'assigned' | 'commented' | 'moved';
  cardId?: ID;
  boardId?: ID;
  text: string;
  createdAt: string;
  read: boolean;
}
export interface Workspace {
  id: ID; name: string; shortName: string;
  color: string; description: string;
  tier: 'free' | 'standard' | 'premium' | 'enterprise';
  memberIds: ID[];
}
// Workspace sub-pages (frontend mock — swap to DB/RBAC in the workspaces phase).
export type WorkspaceMemberRole = 'Admin' | 'Member' | 'Observer';
export type WorkspaceVisibility = 'private' | 'public';
export interface WorkspaceMember {
  id: ID; name: string; email: string;
  role: WorkspaceMemberRole;
  avatarColor: string;
}
export interface BoardTemplate {
  id: ID; name: string; description: string;
  background: string;
  category: 'engineering' | 'marketing' | 'design' | 'personal' | 'education';
  lists: Array<{ title: string; cards: Array<{ title: string; description?: string }> }>;
}
export interface CardTemplate {
  id: ID; name: string; title: string; description: string;
  labelIds: ID[];
  checklistTemplates: Array<{ title: string; items: string[] }>;
}

// Power-Ups (in-house, per-board feature toggles — not a 3rd-party marketplace).
export type PowerUpKey = 'voting' | 'customFields';
export type CustomFieldType = 'text' | 'number' | 'date' | 'dropdown' | 'checkbox';
export interface CustomFieldDef {
  id: ID;
  name: string;
  type: CustomFieldType;
  /** Options for `dropdown` fields. */
  options?: string[];
}
export type CustomFieldValue = string | number | boolean | null;

export interface Label { id: ID; name: string; color: LabelColor }
export interface ActivityEntry { id: ID; type: 'created'|'moved'|'renamed'|'commented'|'labeled'|'due'|'described'; text: string; createdAt: string; author?: string; authorInitials?: string }
export interface ChecklistItem { id: ID; text: string; completed: boolean; createdAt: string }
export interface Checklist { id: ID; title: string; items: ChecklistItem[] }
export interface Card {
  id: ID; listId: ID; title: string; description: string;
  number: number; memberIds: ID[]; attachments: Attachment[];
  labelIds: ID[]; dueDate: string | null; startDate?: string | null; completed: boolean; isArchived: boolean; archivedAt?: string | null;
  /** Due-date reminder lead time (e.g. "none" | "at" | "10m" | "1h" | "1d"). Optional. */
  reminder?: string | null;
  linkedCardIds: ID[];
  checklists: Checklist[];
  /** Power-Up: Voting — member ids who voted (count = length). Optional/additive. */
  votes?: ID[];
  /** Power-Up: Custom Fields — values keyed by the board's field def id. Additive. */
  customFieldValues?: Record<ID, CustomFieldValue>;
  /** Optional location for the Map view. Additive. */
  location?: CardLocation | null;
  activity: ActivityEntry[]; createdAt: string; updatedAt: string;
  cover: {
    type: 'none' | 'color' | 'image';
    color?: string;
    image?: string;
    size: 'half' | 'full';
    textColor?: 'light' | 'dark';
  };
}
export interface List { id: ID; boardId: ID; title: string; cardIds: ID[]; order: number; isArchived: boolean; archivedAt?: string | null; collapsed?: boolean }
export interface Board {
  id: ID; title: string; background: string; description: string;
  listIds: ID[]; createdAt: string; memberIds: ID[]; nextCardNumber: number;
  workspaceId: ID; visibility: BoardVisibility;
  /** Closed (soft-deleted) board — hidden from the grid, restorable from "Closed boards". */
  isArchived?: boolean; archivedAt?: string | null;
  /** Power-Ups enabled on this board (in-house feature toggles). Additive. */
  powerUps?: Partial<Record<PowerUpKey, boolean>>;
  /** Custom Fields power-up: per-board field definitions. Additive. */
  customFields?: CustomFieldDef[];
}
export interface BoardState {
  boards: Record<ID, Board>;
  lists: Record<ID, List>;
  cards: Record<ID, Card>;
  labels: Record<ID, Label>;
  members: Record<ID, Member>;
  workspaces: Record<ID, Workspace>;
  activeWorkspaceId: ID | null;
  boardTemplates: Record<ID, BoardTemplate>;
  cardTemplates: Record<ID, CardTemplate>;
  activeBoardId: ID | null;
  activePanel: 'board' | 'inbox' | 'planner';
  /** Inbox slide-in overlay (left). Transient — not persisted. */
  inboxOpen: boolean;
  /** Switch-boards slide-in overlay (right). Transient — not persisted. */
  switchBoardsOpen: boolean;
  /** Planner side panel (can be open alongside Inbox). Transient. */
  plannerOpen: boolean;
  /** Resizable panel widths (px). Persisted. */
  inboxWidth: number;
  plannerWidth: number;
  /** Personal Inbox capture cards (not yet on a board). Persisted.
   *  completed/dueDate are optional (quick-add doesn't set them) — present so the
   *  Inbox filter can read real fields; unset cards read as "not complete" / "no dates". */
  inboxCards: { id: ID; title: string; createdAt: string; completed?: boolean; dueDate?: string | null }[];
  /** Calendar view state. Persisted. */
  calendarViewDate: string;
  calendarGranularity: 'Month' | 'Week' | 'Day';
  /** Resizable workspace panels (Inbox | Planner | Board). Persisted. */
  panelLayout: PanelLayout;
  starredBoardIds: ID[];
  recentBoardIds: ID[];
  sidebarCollapsed: boolean;
  /** Workspace sidebar width (px) when expanded. Persisted. */
  sidebarWidth: number;
  activeViewByBoard: Record<ID, BoardViewKind>;
  notifications: Notification[];
  selectedCardIds: ID[];
  /** Named, persisted board filters keyed by board id. */
  savedFilters: Record<ID, SavedFilter[]>;
  /** Cards the user watches (subscribed) → eligible for watch notifications. Persisted. */
  watchedCardIds: ID[];
  /** Card aging: fade cards untouched for a long time (board-menu toggle). Persisted. */
  cardAgingEnabled: boolean;
  /** Workspace-home Jira/templates promo banner dismissal. Persisted. */
  jiraPromoDismissed: boolean;
  /** Editable workspace display name shown on the workspace-home header. Persisted. */
  workspaceName: string;
  /** Workspace settings + members (frontend mock — swap to DB in the workspaces phase). Persisted. */
  workspaceDescription: string;
  workspaceVisibility: WorkspaceVisibility;
  workspaceAvatarColor: string;
  workspaceMembers: WorkspaceMember[];
  /** Mock local account identity (single anonymous user). Persisted. */
  userName: string;
  userEmail: string;
  /** Trello "Labs" experimental-features toggle. Persisted. */
  labsEnabled: boolean;
}
