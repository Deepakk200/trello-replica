export type ID = string;
export type LabelColor = 'green'|'yellow'|'orange'|'red'|'purple'|'blue'|'sky'|'lime'|'pink'|'black';
export type DueFilter = ''|'none'|'overdue'|'next24h'|'nextweek'|'complete';
export type BoardVisibility = 'private' | 'workspace' | 'public';
export interface FilterState { search: string; labelIds: ID[]; dueFilter: DueFilter }

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

export interface Label { id: ID; name: string; color: LabelColor }
export interface ActivityEntry { id: ID; type: 'created'|'moved'|'renamed'|'commented'|'labeled'|'due'|'described'; text: string; createdAt: string }
export interface ChecklistItem { id: ID; text: string; completed: boolean; createdAt: string }
export interface Checklist { id: ID; title: string; items: ChecklistItem[] }
export interface Card {
  id: ID; listId: ID; title: string; description: string;
  number: number; memberIds: ID[]; attachments: Attachment[];
  labelIds: ID[]; dueDate: string | null; completed: boolean; isArchived: boolean;
  linkedCardIds: ID[];
  checklists: Checklist[];
  activity: ActivityEntry[]; createdAt: string; updatedAt: string;
  cover: {
    type: 'none' | 'color' | 'image';
    color?: string;
    image?: string;
    size: 'half' | 'full';
    textColor?: 'light' | 'dark';
  };
}
export interface List { id: ID; boardId: ID; title: string; cardIds: ID[]; order: number; isArchived: boolean }
export interface Board {
  id: ID; title: string; background: string; description: string;
  listIds: ID[]; createdAt: string; memberIds: ID[]; nextCardNumber: number;
  workspaceId: ID; visibility: BoardVisibility;
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
  starredBoardIds: ID[];
  recentBoardIds: ID[];
  sidebarCollapsed: boolean;
  activeViewByBoard: Record<ID, 'board' | 'calendar' | 'table' | 'dashboard'>;
  notifications: Notification[];
  selectedCardIds: ID[];
}
