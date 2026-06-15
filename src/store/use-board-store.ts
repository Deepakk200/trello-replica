import { create } from 'zustand';
import { useStore } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { nanoid } from 'nanoid';
import type {
  ID, Board, List, Card, Label, Member, Attachment,
  Workspace, BoardTemplate, CardTemplate, BoardVisibility,
  ActivityEntry, BoardState, FilterState, Checklist, Notification,
} from '@/types';
// Butler automation: emit board events after mutations (no-op until the engine
// registers a handler on the client). Decoupled via the bus → no import cycle.
import { emitBoardEvent } from '@/lib/automation/bus';

// ─── Helpers ────────────────────────────────────────────────────────────────

function newId() { return nanoid(8); }
function now()   { return new Date().toISOString(); }
function makeActivity(entry: Omit<ActivityEntry, 'id' | 'createdAt'>): ActivityEntry {
  return { ...entry, id: newId(), createdAt: now() };
}
function makeNotification(entry: Omit<Notification, 'id' | 'createdAt' | 'read'>): Notification {
  return { ...entry, id: newId(), createdAt: now(), read: false };
}

function isWithin24Hours(iso: string): boolean {
  const due = new Date(iso).getTime();
  if (Number.isNaN(due)) return false;
  return due - Date.now() <= 24 * 60 * 60 * 1000 && due >= Date.now() - 60 * 1000;
}

// ─── Seed constants ──────────────────────────────────────────────────────────

const MEMBER_DEFS: Array<Omit<Member, 'id'>> = [
  { name: 'Alex Chen',   initials: 'AC', color: 'linear-gradient(135deg,#667eea,#764ba2)' },
  { name: 'Maya Patel',  initials: 'MP', color: 'linear-gradient(135deg,#f093fb,#f5576c)' },
  { name: 'Sam Wright',  initials: 'SW', color: 'linear-gradient(135deg,#4facfe,#00f2fe)' },
  { name: 'Jordan Lee',  initials: 'JL', color: 'linear-gradient(135deg,#43e97b,#38f9d7)' },
  { name: 'Riya Sharma', initials: 'RS', color: 'linear-gradient(135deg,#fa709a,#fee140)' },
  { name: 'Theo Garcia', initials: 'TG', color: 'linear-gradient(135deg,#a18cd1,#fbc2eb)' },
];

const BOARD_TEMPLATE_DEFS: Array<Omit<BoardTemplate, 'id'>> = [
  {
    name: 'Kanban Board', description: 'Visualize work with a flexible Kanban board.',
    background: 'linear-gradient(135deg,#0079bf,#5067c5)', category: 'engineering',
    lists: [
      { title: 'Backlog',     cards: [{ title: 'Setup project structure' }, { title: 'Define tech stack' }] },
      { title: 'In Progress', cards: [{ title: 'Build core features' }] },
      { title: 'Review',      cards: [] },
      { title: 'Done',        cards: [{ title: 'Project kickoff' }] },
    ],
  },
  {
    name: 'Sprint Planning', description: 'Manage sprints with product and sprint backlogs.',
    background: 'linear-gradient(135deg,#519839,#4bce97)', category: 'engineering',
    lists: [
      { title: 'Product Backlog', cards: [{ title: 'User authentication' }, { title: 'Dashboard UI' }] },
      { title: 'Sprint Backlog', cards: [{ title: 'Login page' }] },
      { title: 'In Progress',    cards: [] },
      { title: 'Done',           cards: [] },
    ],
  },
  {
    name: 'Content Calendar', description: 'Plan and publish content across channels.',
    background: 'linear-gradient(135deg,#d29034,#f5a623)', category: 'marketing',
    lists: [
      { title: 'Ideas',     cards: [{ title: 'Q1 blog post ideas' }, { title: 'Social media themes' }] },
      { title: 'Drafting',  cards: [{ title: 'January newsletter' }] },
      { title: 'Review',    cards: [] },
      { title: 'Published', cards: [{ title: 'Welcome post' }] },
    ],
  },
  {
    name: 'Personal Goals', description: 'Track personal milestones and habits.',
    background: 'linear-gradient(135deg,#b04632,#e2483d)', category: 'personal',
    lists: [
      { title: 'Goals',       cards: [{ title: 'Learn TypeScript' }, { title: 'Exercise routine' }] },
      { title: 'In Progress', cards: [{ title: 'Read 12 books' }] },
      { title: 'Completed',   cards: [{ title: 'Morning routine' }] },
    ],
  },
];

const CARD_TEMPLATE_DEFS: Array<Omit<CardTemplate, 'id'>> = [
  {
    name: 'Bug Report', title: '[Bug] ',
    description: '## Summary\n\n## Steps to Reproduce\n1. \n2. \n\n## Expected Behavior\n\n## Actual Behavior\n\n## Environment\n- OS: \n- Browser: ',
    labelIds: [],
    checklistTemplates: [{ title: 'Bug Checklist', items: ['Reproduce the bug', 'Identify root cause', 'Write fix', 'Write tests', 'Deploy'] }],
  },
  {
    name: 'Feature Request', title: '[Feature] ',
    description: '## Overview\n\n## Problem Statement\n\n## Proposed Solution\n\n## Acceptance Criteria\n- [ ] ',
    labelIds: [],
    checklistTemplates: [{ title: 'Implementation', items: ['Design review', 'Implementation', 'Code review', 'QA testing', 'Deploy'] }],
  },
  {
    name: 'Meeting Notes', title: '[Meeting] ',
    description: '## Attendees\n\n## Agenda\n\n## Discussion Points\n\n## Action Items\n\n## Next Steps',
    labelIds: [],
    checklistTemplates: [{ title: 'Follow-up', items: ['Send meeting summary', 'Assign action items', 'Schedule next meeting'] }],
  },
];

// ─── Seed builders ───────────────────────────────────────────────────────────

function buildMembers(): { members: Record<ID, Member>; memberIds: ID[] } {
  const members: Record<ID, Member> = {};
  const memberIds: ID[] = [];
  for (const def of MEMBER_DEFS) {
    const id = newId(); members[id] = { id, ...def }; memberIds.push(id);
  }
  return { members, memberIds };
}

function buildWorkspaces(memberIds: ID[]): { workspaces: Record<ID, Workspace>; ws1Id: ID } {
  const ws1Id = newId(); const ws2Id = newId();
  const workspaces: Record<ID, Workspace> = {
    [ws1Id]: { id: ws1Id, name: 'My Workspace', shortName: 'MW', color: 'linear-gradient(135deg,#d29034,#e67e22)', description: '', tier: 'free',    memberIds: memberIds.slice(0, 4) },
    [ws2Id]: { id: ws2Id, name: 'Acme Inc.',    shortName: 'AC', color: 'linear-gradient(135deg,#0079bf,#5067c5)', description: '', tier: 'premium', memberIds: memberIds },
  };
  return { workspaces, ws1Id };
}

function buildBoardTemplates(): Record<ID, BoardTemplate> {
  const out: Record<ID, BoardTemplate> = {};
  for (const def of BOARD_TEMPLATE_DEFS) { const id = newId(); out[id] = { id, ...def }; }
  return out;
}

function buildCardTemplates(): Record<ID, CardTemplate> {
  const out: Record<ID, CardTemplate> = {};
  for (const def of CARD_TEMPLATE_DEFS) { const id = newId(); out[id] = { id, ...def }; }
  return out;
}

function buildSeed(): BoardState {
  const boardId = newId();
  const listIds = [newId(), newId(), newId(), newId()];
  const listTitles = ['Backlog', 'To Do', 'In Progress', 'Done'];
  const labelDefs: Array<{ name: string; color: Label['color'] }> = [
    { name: 'Bug', color: 'red' }, { name: 'Feature', color: 'green' },
    { name: 'Improvement', color: 'blue' }, { name: 'Question', color: 'yellow' },
    { name: 'Design', color: 'purple' }, { name: 'Urgent', color: 'orange' },
  ];

  const { members, memberIds } = buildMembers();
  const { workspaces, ws1Id } = buildWorkspaces(memberIds);
  const boardTemplates = buildBoardTemplates();
  const cardTemplates  = buildCardTemplates();

  const boards: Record<ID, Board> = {
    [boardId]: {
      id: boardId, title: 'My Trello Board',
      background: 'linear-gradient(135deg,#0079bf,#5067c5)',
      description: '', listIds, createdAt: now(),
      memberIds: memberIds.slice(0, 4), nextCardNumber: 9,
      workspaceId: ws1Id, visibility: 'workspace',
    },
  };

  const labels: Record<ID, Label> = {};
  const seedLabelIds: ID[] = [];
  for (const def of labelDefs) { const id = newId(); labels[id] = { id, ...def }; seedLabelIds.push(id); }
  // [0]=Bug/red [1]=Feature/green [2]=Improvement/blue [3]=Question/yellow [4]=Design/purple [5]=Urgent/orange

  const overdueDt = new Date(Date.now() - 2 * 86400000).toISOString();
  const soonDt    = new Date(Date.now() + 20 * 3600000).toISOString();
  const futureDt  = new Date(Date.now() + 7 * 86400000).toISOString();
  const pastDt    = new Date(Date.now() - 3 * 86400000).toISOString();

  type RichDef = {
    title: string; description: string; lIdxs: number[];
    dueDate: string | null; completed: boolean;
    cls: Array<{ title: string; items: Array<{ text: string; completed: boolean }> }>;
    mIdxs: number[];
    cover?: { type: 'color'; color: string; size: 'half' };
    comments?: string[];
  };
  const richDefs: RichDef[][] = [
    // Backlog
    [
      { title: 'Research competitors', description: 'Analyze Trello, Jira, Asana for feature gaps and UX patterns.', lIdxs: [3], dueDate: overdueDt, completed: false, cls: [], mIdxs: [0], cover: { type: 'color', color: '#579DFF', size: 'half' } },
      { title: 'Define MVP scope',     description: '', lIdxs: [1, 5], dueDate: null, completed: false, cls: [], mIdxs: [1] },
    ],
    // To Do
    [
      { title: 'Set up project repo', description: 'Initialize Next.js with TypeScript, Tailwind, and Zustand.',
        lIdxs: [2], dueDate: soonDt, completed: false,
        cls: [{ title: 'Setup Tasks', items: [
          { text: 'Create GitHub repo', completed: true },
          { text: 'Install dependencies', completed: true },
          { text: 'Configure ESLint', completed: false },
          { text: 'Setup CI/CD', completed: false },
        ] }],
        mIdxs: [0, 2] },
      { title: 'Write user stories', description: '', lIdxs: [1], dueDate: futureDt, completed: false, cls: [], mIdxs: [1], comments: ['Should we include edge cases in the stories?', 'Added acceptance criteria to each story.'] },
    ],
    // In Progress
    [
      { title: 'Build board view', description: 'Implement the main Kanban board with draggable lists and cards.', lIdxs: [1, 2], dueDate: null, completed: false, cls: [], mIdxs: [0] },
      { title: 'Implement drag-and-drop', description: '', lIdxs: [0], dueDate: soonDt, completed: false,
        cls: [{ title: 'DnD Checklist', items: [
          { text: 'Card drag within list', completed: true },
          { text: 'Cross-list drag', completed: true },
          { text: 'List reorder', completed: true },
          { text: 'Touch + keyboard support', completed: true },
        ] }],
        mIdxs: [2, 3] },
    ],
    // Done
    [
      { title: 'Deploy to Vercel', description: 'Configure production deployment with environment variables.', lIdxs: [5], dueDate: pastDt, completed: true, cls: [], mIdxs: [0] },
      { title: 'Write README',     description: '', lIdxs: [4], dueDate: null, completed: false, cls: [], mIdxs: [1] },
    ],
  ];

  const lists: Record<ID, List> = {};
  const cards: Record<ID, Card> = {};

  let cardNumber = 1;
  listIds.forEach((listId, i) => {
    const cardIds: ID[] = [];
    for (const def of richDefs[i]) {
      const cardId = newId(); const ts = now();
      const checklists: Checklist[] = def.cls.map((cl) => ({
        id: newId(), title: cl.title,
        items: cl.items.map((it) => ({ id: newId(), text: it.text, completed: it.completed, createdAt: ts })),
      }));
      const activity = [
        makeActivity({ type: 'created', text: `Card "${def.title}" created` }),
        ...(def.comments ?? []).map((text) => makeActivity({ type: 'commented', text })),
      ];
      cards[cardId] = {
        id: cardId, listId, title: def.title, description: def.description,
        number: cardNumber++,
        memberIds: def.mIdxs.map((mi) => memberIds[mi]).filter(Boolean),
        attachments: [],
        labelIds: def.lIdxs.map((li) => seedLabelIds[li]).filter(Boolean),
        dueDate: def.dueDate, completed: def.completed, isArchived: false, linkedCardIds: [],
        cover: def.cover ?? { type: 'none', size: 'half' }, checklists,
        activity,
        createdAt: ts, updatedAt: ts,
      };
      cardIds.push(cardId);
    }
    lists[listId] = { id: listId, boardId, title: listTitles[i], cardIds, order: i, isArchived: false };
  });

  return {
    boards, lists, cards, labels, members,
    workspaces, activeWorkspaceId: ws1Id,
    boardTemplates, cardTemplates,
    activePanel: 'board',
    inboxOpen: false, switchBoardsOpen: false, plannerOpen: false, inboxWidth: 360, plannerWidth: 360,
    panelLayout: { inboxWidth: 320, plannerWidth: 380, inboxCollapsed: true, plannerCollapsed: true, boardCollapsed: false },
    activeViewByBoard: {} as Record<ID, 'board' | 'calendar' | 'table' | 'dashboard'>,
    activeBoardId: boardId, starredBoardIds: [], recentBoardIds: [boardId], sidebarCollapsed: false,
    notifications: [
      makeNotification({ type: 'commented', boardId, cardId: Object.keys(cards)[0], text: 'Maya commented on Research competitors' }),
      makeNotification({ type: 'due_soon', boardId, cardId: Object.keys(cards)[1], text: 'Write user stories is due soon' }),
      makeNotification({ type: 'assigned', boardId, cardId: Object.keys(cards)[2], text: 'You were assigned to Build board view' }),
      makeNotification({ type: 'moved', boardId, text: 'Project kickoff was moved to Done' }),
    ],
    selectedCardIds: [], inboxCards: [], calendarViewDate: new Date().toISOString(), calendarGranularity: 'Month',
    jiraPromoDismissed: false, workspaceName: 'Trello Workspace',
    userName: 'deepak chandra', userEmail: 'nagireddydeepakchandra@gmail.com', labsEnabled: false,
  };
}

// ─── Store types ─────────────────────────────────────────────────────────────

type Transient = {
  _hasHydrated: boolean;
  filterState: FilterState;
  notificationsOpen: boolean;
  activeCardModalId: ID | null;
  watchedListIds: ID[];
};

type Actions = {
  createBoard(title: string, background: string): ID;
  copyBoard(boardId: ID, newTitle: string): ID;
  renameBoard(id: ID, title: string): void;
  deleteBoard(id: ID): void;
  setActiveBoard(id: ID): void;
  setActivePanel(panel: 'board' | 'inbox' | 'planner'): void;
  setInboxOpen(v: boolean): void;
  setSwitchBoardsOpen(v: boolean): void;
  setPlannerOpen(v: boolean): void;
  setInboxWidth(w: number): void;
  setPlannerWidth(w: number): void;
  addInboxCard(title: string): void;
  deleteInboxCard(id: ID): void;
  moveInboxCardToList(inboxCardId: ID, listId: ID): void;
  setCalendarViewDate(iso: string): void;
  setCalendarGranularity(g: 'Month' | 'Week' | 'Day'): void;
  setPanelWidth(panel: 'inbox' | 'planner', width: number): void;
  togglePanelCollapse(panel: 'inbox' | 'planner' | 'board'): void;
  expandPanel(panel: 'inbox' | 'planner' | 'board'): void;
  createList(boardId: ID, title: string): ID;
  renameList(id: ID, title: string): void;
  deleteList(id: ID): void;
  reorderLists(boardId: ID, orderedIds: ID[]): void;
  toggleListCollapse(listId: ID): void;
  createCard(listId: ID, title: string): ID;
  updateCard(id: ID, patch: Partial<Pick<Card, 'title'|'description'|'dueDate'|'startDate'|'completed'|'labelIds'>>): void;
  deleteCard(id: ID): void;
  moveCard(cardId: ID, toListId: ID, toIndex: number): void;
  reorderCardsInList(listId: ID, orderedIds: ID[]): void;
  upsertLabel(label: Label): void;
  toggleCardLabel(cardId: ID, labelId: ID): void;
  addMember(def: Omit<Member, 'id'>): ID;
  addMemberToBoard(boardId: ID, memberId: ID): void;
  toggleCardMember(cardId: ID, memberId: ID): void;
  addAttachment(cardId: ID, attachment: Omit<Attachment, 'id'|'addedAt'>): ID;
  removeAttachment(cardId: ID, attachmentId: ID): void;
  setCardCoverFromAttachment(cardId: ID, attachmentId: ID): void;
  // workspaces
  createWorkspace(name: string, shortName: string, color: string): ID;
  setActiveWorkspace(id: ID): void;
  updateBoardVisibility(boardId: ID, visibility: BoardVisibility): void;
  // templates
  createBoardFromTemplate(templateId: ID, title: string, workspaceId: ID): ID;
  createCardFromTemplate(templateId: ID, listId: ID): ID;
  saveBoardAsTemplate(boardId: ID, name: string): ID;
  saveCardAsTemplate(cardId: ID, name: string): ID;
  setBoardView(boardId: ID, view: 'board' | 'calendar' | 'table' | 'dashboard'): void;
  // activity / covers / checklists
  pushActivity(cardId: ID, entry: Omit<ActivityEntry, 'id'|'createdAt'>): void;
  updateComment(cardId: ID, commentId: ID, newContent: string): void;
  deleteComment(cardId: ID, commentId: ID): void;
  updateCardCover(cardId: ID, cover: Card['cover']): void;
  createChecklist(cardId: ID, title: string): ID;
  renameChecklist(cardId: ID, checklistId: ID, title: string): void;
  deleteChecklist(cardId: ID, checklistId: ID): void;
  addChecklistItem(cardId: ID, checklistId: ID, text: string): ID;
  toggleChecklistItem(cardId: ID, checklistId: ID, itemId: ID): void;
  renameChecklistItem(cardId: ID, checklistId: ID, itemId: ID, text: string): void;
  deleteChecklistItem(cardId: ID, checklistId: ID, itemId: ID): void;
  toggleStarBoard(boardId: ID): void;
  pushRecentBoard(boardId: ID): void;
  toggleSidebar(): void;
  setFilter(patch: Partial<FilterState>): void;
  archiveCard(cardId: ID): void;
  restoreCard(cardId: ID): void;
  archiveList(listId: ID): void;
  restoreList(listId: ID): void;
  sortList(listId: ID, by: 'created-asc' | 'created-desc' | 'name' | 'due'): void;
  copyList(listId: ID): ID;
  moveAllCards(fromListId: ID, toListId: ID): void;
  archiveAllCardsInList(listId: ID): void;
  toggleWatchList(listId: ID): void;
  reorderListToPosition(listId: ID, position: number): void;
  updateBoardBackground(boardId: ID, background: string): void;
  updateBoardDescription(boardId: ID, description: string): void;
  pushNotification(n: Omit<Notification, 'id' | 'createdAt' | 'read'>): void;
  markNotificationRead(id: ID): void;
  markAllNotificationsRead(): void;
  clearNotifications(): void;
  toggleCardSelection(cardId: ID): void;
  clearCardSelection(): void;
  bulkArchiveCards(cardIds: ID[]): void;
  bulkMoveCards(cardIds: ID[], toListId: ID): void;
  bulkAddLabelToCards(cardIds: ID[], labelId: ID): void;
  linkCards(fromCardId: ID, toCardId: ID): void;
  unlinkCards(fromCardId: ID, toCardId: ID): void;
  toggleNotificationsDrawer(): void;
  closeNotificationsDrawer(): void;
  setActiveCardModal(cardId: ID | null): void;
  clearActiveCardModal(): void;
  setJiraPromoDismissed(v: boolean): void;
  setWorkspaceName(name: string): void;
  setUserName(name: string): void;
  setUserEmail(email: string): void;
  setLabsEnabled(v: boolean): void;
  clearAll(): void;
};

type Store = BoardState & Actions & Transient;

// ─── SSR-safe storage ────────────────────────────────────────────────────────

const safeStorage = createJSONStorage(() => {
  if (typeof window === 'undefined') return { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  return localStorage;
});

// ─── Store ───────────────────────────────────────────────────────────────────

export const boardStore = create<Store>()(
  persist(
    immer((set) => ({
      _hasHydrated: false,
      filterState: { search: '', labelIds: [] as ID[], dueFilter: '' } as FilterState,
      boards: {}, lists: {}, cards: {}, labels: {}, members: {},
      workspaces: {}, activeWorkspaceId: null,
      boardTemplates: {}, cardTemplates: {},
      activeViewByBoard: {} as Record<ID, 'board' | 'calendar' | 'table' | 'dashboard'>,
      activeBoardId: null, activePanel: 'board', inboxOpen: false, switchBoardsOpen: false, plannerOpen: false, inboxWidth: 360, plannerWidth: 360,
      panelLayout: { inboxWidth: 320, plannerWidth: 380, inboxCollapsed: true, plannerCollapsed: true, boardCollapsed: false },
      starredBoardIds: [], recentBoardIds: [], sidebarCollapsed: false,
      notifications: [], selectedCardIds: [], inboxCards: [], calendarViewDate: new Date().toISOString(), calendarGranularity: 'Month',
      notificationsOpen: false, activeCardModalId: null, watchedListIds: [],
      jiraPromoDismissed: false, workspaceName: 'Trello Workspace',
      userName: 'deepak chandra', userEmail: 'nagireddydeepakchandra@gmail.com', labsEnabled: false,

      // ── Boards ──────────────────────────────────────────────────
      createBoard(title, background) {
        const id = newId(); const ts = now();
        set((s) => {
          const workspaceId = s.activeWorkspaceId ?? Object.keys(s.workspaces)[0] ?? '';
          s.boards[id] = { id, title, background, description: '', listIds: [], createdAt: ts, memberIds: [], nextCardNumber: 1, workspaceId, visibility: 'workspace' };
          s.activeBoardId = id;
          s.recentBoardIds = [id, ...(s.recentBoardIds ?? []).filter((r) => r !== id)].slice(0, 5);
        });
        return id;
      },
      copyBoard(boardId, newTitle) {
        const orig = boardStore.getState().boards[boardId];
        if (!orig) return '' as ID;
        const newBoardId = newId(); const ts = now();
        set((s) => {
          const origBoard = s.boards[boardId]; if (!origBoard) return;
          const newListIds: ID[] = [];
          let nextNum = 1;
          for (const listId of origBoard.listIds) {
            const origList = s.lists[listId];
            if (!origList || origList.isArchived) continue;
            const newListId = newId();
            const newCardIds: ID[] = [];
            for (const cardId of origList.cardIds) {
              const card = s.cards[cardId];
              if (!card || card.isArchived) continue;
              const newCardId = newId();
              s.cards[newCardId] = {
                ...card,
                id: newCardId, listId: newListId, number: nextNum++,
                attachments: card.attachments.map((a) => ({ ...a, id: newId() })),
                checklists: card.checklists.map((cl) => ({
                  ...cl, id: newId(),
                  items: cl.items.map((it) => ({ ...it, id: newId() })),
                })),
                linkedCardIds: [],
                activity: [makeActivity({ type: 'created', text: `Card "${card.title}" copied` })],
                createdAt: ts, updatedAt: ts,
              };
              newCardIds.push(newCardId);
            }
            s.lists[newListId] = {
              id: newListId, boardId: newBoardId, title: origList.title,
              cardIds: newCardIds, order: newListIds.length, isArchived: false,
            };
            newListIds.push(newListId);
          }
          s.boards[newBoardId] = {
            ...origBoard,
            id: newBoardId, title: newTitle, listIds: newListIds,
            createdAt: ts, nextCardNumber: nextNum,
          };
          s.activeBoardId = newBoardId;
          s.recentBoardIds = [newBoardId, ...(s.recentBoardIds ?? []).filter((r) => r !== newBoardId)].slice(0, 5);
        });
        return newBoardId;
      },
      renameBoard(id, title) { set((s) => { if (s.boards[id]) s.boards[id].title = title; }); },
      deleteBoard(id) {
        set((s) => {
          const board = s.boards[id]; if (!board) return;
          for (const listId of board.listIds) {
            const list = s.lists[listId];
            if (list) { for (const cardId of list.cardIds) delete s.cards[cardId]; delete s.lists[listId]; }
          }
          delete s.boards[id];
          if (s.activeBoardId === id) {
            const remaining = Object.keys(s.boards);
            s.activeBoardId = remaining.length ? remaining[0] : null;
          }
        });
      },
      setActiveBoard(id) {
        set((s) => {
          s.activeBoardId = id;
          s.recentBoardIds = [id, ...(s.recentBoardIds ?? []).filter((r) => r !== id)].slice(0, 5);
          s.selectedCardIds = [];
        });
      },
      setActivePanel(panel) { set((s) => { s.activePanel = panel; }); },
      setInboxOpen(v) { set((s) => { s.inboxOpen = v; }); },
      setSwitchBoardsOpen(v) { set((s) => { s.switchBoardsOpen = v; }); },
      setPlannerOpen(v) { set((s) => { s.plannerOpen = v; }); },
      setInboxWidth(w) { set((s) => { s.inboxWidth = Math.max(280, Math.min(560, w)); }); },
      setPlannerWidth(w) { set((s) => { s.plannerWidth = Math.max(280, Math.min(640, w)); }); },
      addInboxCard(title) {
        const t = title.trim(); if (!t) return;
        set((s) => { s.inboxCards.unshift({ id: newId(), title: t, createdAt: now() }); });
      },
      deleteInboxCard(id) {
        set((s) => { s.inboxCards = s.inboxCards.filter((c) => c.id !== id); });
      },
      moveInboxCardToList(inboxCardId, listId) {
        const card = boardStore.getState().inboxCards.find((c) => c.id === inboxCardId);
        if (!card) return;
        boardStore.getState().createCard(listId, card.title);
        set((s) => { s.inboxCards = s.inboxCards.filter((c) => c.id !== inboxCardId); });
      },
      setCalendarViewDate(iso) { set((s) => { s.calendarViewDate = iso; }); },
      setCalendarGranularity(g) { set((s) => { s.calendarGranularity = g; }); },
      setPanelWidth(panel, width) {
        set((s) => {
          const w = Math.max(220, Math.min(640, Math.round(width)));
          if (panel === 'inbox') s.panelLayout.inboxWidth = w;
          else s.panelLayout.plannerWidth = w;
        });
      },
      togglePanelCollapse(panel) {
        set((s) => {
          if (panel === 'inbox') s.panelLayout.inboxCollapsed = !s.panelLayout.inboxCollapsed;
          else if (panel === 'planner') s.panelLayout.plannerCollapsed = !s.panelLayout.plannerCollapsed;
          else s.panelLayout.boardCollapsed = !s.panelLayout.boardCollapsed;
        });
      },
      expandPanel(panel) {
        set((s) => {
          if (panel === 'inbox') s.panelLayout.inboxCollapsed = false;
          else if (panel === 'planner') s.panelLayout.plannerCollapsed = false;
          else s.panelLayout.boardCollapsed = false;
        });
      },

      // ── Lists ───────────────────────────────────────────────────
      createList(boardId, title) {
        const id = newId();
        set((s) => {
          const board = s.boards[boardId]; if (!board) return;
          s.lists[id] = { id, boardId, title, cardIds: [], order: board.listIds.length, isArchived: false };
          board.listIds.push(id);
        });
        return id;
      },
      renameList(id, title) { set((s) => { if (s.lists[id]) s.lists[id].title = title; }); },
      toggleListCollapse(listId) { set((s) => { if (s.lists[listId]) s.lists[listId].collapsed = !s.lists[listId].collapsed; }); },
      deleteList(id) {
        set((s) => {
          const list = s.lists[id]; if (!list) return;
          for (const cardId of list.cardIds) delete s.cards[cardId];
          const board = s.boards[list.boardId];
          if (board) board.listIds = board.listIds.filter((lid) => lid !== id);
          delete s.lists[id];
        });
      },
      reorderLists(boardId, orderedIds) {
        set((s) => {
          const board = s.boards[boardId]; if (!board) return;
          board.listIds = orderedIds;
          orderedIds.forEach((lid, i) => { if (s.lists[lid]) s.lists[lid].order = i; });
        });
      },

      // ── Cards ───────────────────────────────────────────────────
      createCard(listId, title) {
        const id = newId(); const ts = now();
        set((s) => {
          const list = s.lists[listId]; if (!list) return;
          const board = s.boards[list.boardId];
          const num = board?.nextCardNumber ?? 1;
          if (board) board.nextCardNumber = num + 1;
          s.cards[id] = {
            id, listId, title, description: '', number: num, memberIds: [], attachments: [],
            labelIds: [], dueDate: null, completed: false, isArchived: false,
            linkedCardIds: [],
            cover: { type: 'none', size: 'half' }, checklists: [],
            activity: [makeActivity({ type: 'created', text: `Card "${title}" created` })],
            createdAt: ts, updatedAt: ts,
          };
          list.cardIds.push(id);
        });
        const bId = boardStore.getState().lists[listId]?.boardId;
        if (bId) emitBoardEvent({ type: 'card.created', boardId: bId, cardId: id, listId });
        return id;
      },
      updateCard(id, patch) {
        set((s) => {
          const card = s.cards[id]; if (!card) return;
          const ts = now();
          if (patch.title !== undefined && patch.title !== card.title)
            card.activity.push(makeActivity({ type: 'renamed', text: `Renamed to "${patch.title}"` }));
          if (patch.dueDate !== undefined && patch.dueDate !== card.dueDate)
            card.activity.push(makeActivity({ type: 'due', text: patch.dueDate ? `Due date set to ${patch.dueDate}` : 'Due date removed' }));
          if (patch.dueDate && patch.dueDate !== card.dueDate && isWithin24Hours(patch.dueDate)) {
            s.notifications.unshift(makeNotification({
              type: 'due_soon',
              cardId: card.id,
              boardId: s.lists[card.listId]?.boardId,
              text: `${card.title} is due within 24 hours`,
            }));
          }
          if (patch.description !== undefined && patch.description !== card.description)
            card.activity.push(makeActivity({ type: 'described', text: 'Description updated' }));
          Object.assign(card, patch, { updatedAt: ts });
        });
        const c = boardStore.getState().cards[id];
        const bId = c ? boardStore.getState().lists[c.listId]?.boardId : undefined;
        if (c && bId) {
          if (patch.dueDate) emitBoardEvent({ type: 'due.set', boardId: bId, cardId: id, listId: c.listId });
          if (patch.completed === true) emitBoardEvent({ type: 'card.completed', boardId: bId, cardId: id, listId: c.listId });
        }
      },
      deleteCard(id) {
        set((s) => {
          const card = s.cards[id]; if (!card) return;
          const list = s.lists[card.listId];
          if (list) list.cardIds = list.cardIds.filter((cid) => cid !== id);
          for (const other of Object.values(s.cards)) {
            if (other.linkedCardIds?.includes(id)) other.linkedCardIds = other.linkedCardIds.filter((linkedId) => linkedId !== id);
          }
          s.selectedCardIds = s.selectedCardIds.filter((cardId) => cardId !== id);
          if (s.activeCardModalId === id) s.activeCardModalId = null;
          delete s.cards[id];
        });
      },
      moveCard(cardId, toListId, toIndex) {
        const fromListId = boardStore.getState().cards[cardId]?.listId;
        set((s) => {
          const card = s.cards[cardId]; if (!card) return;
          const fromList = s.lists[card.listId]; const toList = s.lists[toListId];
          if (!fromList || !toList) return;
          const originListId = card.listId;
          fromList.cardIds = fromList.cardIds.filter((cid) => cid !== cardId);
          toList.cardIds.splice(toIndex, 0, cardId);
          card.listId = toListId; card.updatedAt = now();
          card.activity.push(makeActivity({
            type: 'moved',
            text: originListId !== toListId
              ? `Moved from "${fromList.title}" to "${toList.title}"`
              : `Moved within "${toList.title}"`,
          }));
        });
        // Fire "moved into list" only when the list actually changed.
        if (fromListId && fromListId !== toListId) {
          const bId = boardStore.getState().lists[toListId]?.boardId;
          if (bId) emitBoardEvent({ type: 'card.moved', boardId: bId, cardId, listId: toListId });
        }
      },
      reorderCardsInList(listId, orderedIds) {
        set((s) => { if (s.lists[listId]) s.lists[listId].cardIds = orderedIds; });
      },

      pushNotification(notification) {
        set((s) => { s.notifications.unshift(makeNotification(notification)); });
      },
      markNotificationRead(id) {
        set((s) => {
          const notification = s.notifications.find((item) => item.id === id);
          if (notification) notification.read = true;
        });
      },
      markAllNotificationsRead() {
        set((s) => { for (const notification of s.notifications) notification.read = true; });
      },
      clearNotifications() { set((s) => { s.notifications = []; }); },
      toggleCardSelection(cardId) {
        set((s) => {
          const idx = s.selectedCardIds.indexOf(cardId);
          if (idx === -1) s.selectedCardIds.push(cardId);
          else s.selectedCardIds.splice(idx, 1);
        });
      },
      clearCardSelection() { set((s) => { s.selectedCardIds = []; }); },
      bulkArchiveCards(cardIds) {
        set((s) => {
          for (const cardId of cardIds) {
            const card = s.cards[cardId]; if (!card) continue;
            card.isArchived = true;
            card.activity.push(makeActivity({ type: 'described', text: 'archived this card' }));
            card.updatedAt = now();
          }
          s.selectedCardIds = s.selectedCardIds.filter((cardId) => !cardIds.includes(cardId));
        });
      },
      bulkMoveCards(cardIds, toListId) {
        set((s) => {
          const toList = s.lists[toListId]; if (!toList) return;
          for (const cardId of cardIds) {
            const card = s.cards[cardId]; if (!card) continue;
            const fromList = s.lists[card.listId];
            if (!fromList) continue;
            fromList.cardIds = fromList.cardIds.filter((cid) => cid !== cardId);
            if (!toList.cardIds.includes(cardId)) toList.cardIds.push(cardId);
            const fromListTitle = fromList.title;
            card.listId = toListId;
            card.updatedAt = now();
            card.activity.push(makeActivity({
              type: 'moved',
              text: fromList.id !== toListId
                ? `Moved from "${fromListTitle}" to "${toList.title}"`
                : `Moved within "${toList.title}"`,
            }));
          }
        });
      },
      bulkAddLabelToCards(cardIds, labelId) {
        set((s) => {
          for (const cardId of cardIds) {
            const card = s.cards[cardId]; if (!card) continue;
            if (!card.labelIds.includes(labelId)) card.labelIds.push(labelId);
            card.updatedAt = now();
          }
        });
      },
      linkCards(fromCardId, toCardId) {
        if (fromCardId === toCardId) return;
        set((s) => {
          const fromCard = s.cards[fromCardId];
          const toCard = s.cards[toCardId];
          if (!fromCard || !toCard) return;
          if (!fromCard.linkedCardIds.includes(toCardId)) fromCard.linkedCardIds.push(toCardId);
          if (!toCard.linkedCardIds.includes(fromCardId)) toCard.linkedCardIds.push(fromCardId);
          fromCard.updatedAt = now();
          toCard.updatedAt = now();
        });
      },
      unlinkCards(fromCardId, toCardId) {
        set((s) => {
          const fromCard = s.cards[fromCardId];
          const toCard = s.cards[toCardId];
          if (fromCard) fromCard.linkedCardIds = fromCard.linkedCardIds.filter((id) => id !== toCardId);
          if (toCard) toCard.linkedCardIds = toCard.linkedCardIds.filter((id) => id !== fromCardId);
        });
      },
      toggleNotificationsDrawer() { set((s) => { s.notificationsOpen = !s.notificationsOpen; }); },
      closeNotificationsDrawer() { set((s) => { s.notificationsOpen = false; }); },
      setActiveCardModal(cardId) { set((s) => { s.activeCardModalId = cardId; }); },
      clearActiveCardModal() { set((s) => { s.activeCardModalId = null; }); },
      setJiraPromoDismissed(v) { set((s) => { s.jiraPromoDismissed = v; }); },
      setWorkspaceName(name) { set((s) => { s.workspaceName = name.trim() || 'Trello Workspace'; }); },
      setUserName(name) { set((s) => { s.userName = name.trim() || 'deepak chandra'; }); },
      setUserEmail(email) { set((s) => { s.userEmail = email.trim(); }); },
      setLabsEnabled(v) { set((s) => { s.labsEnabled = v; }); },

      // ── Labels ──────────────────────────────────────────────────
      upsertLabel(label) { set((s) => { s.labels[label.id] = label; }); },
      toggleCardLabel(cardId, labelId) {
        set((s) => {
          const card = s.cards[cardId]; if (!card) return;
          const idx = card.labelIds.indexOf(labelId);
          const label = s.labels[labelId];
          if (idx === -1) {
            card.labelIds.push(labelId);
            card.activity.push(makeActivity({ type: 'labeled', text: `Label "${label?.name ?? labelId}" added` }));
          } else {
            card.labelIds.splice(idx, 1);
            card.activity.push(makeActivity({ type: 'labeled', text: `Label "${label?.name ?? labelId}" removed` }));
          }
          card.updatedAt = now();
        });
        const card = boardStore.getState().cards[cardId];
        if (card) {
          const bId = boardStore.getState().lists[card.listId]?.boardId;
          const added = card.labelIds.includes(labelId);
          if (bId) emitBoardEvent({ type: added ? 'label.added' : 'label.removed', boardId: bId, cardId, listId: card.listId, labelId });
        }
      },

      // ── Members ──────────────────────────────────────────────────
      addMember(def) {
        const id = newId();
        set((s) => { s.members[id] = { id, ...def }; });
        return id;
      },
      addMemberToBoard(boardId, memberId) {
        set((s) => {
          const board = s.boards[boardId]; if (!board) return;
          if (!board.memberIds.includes(memberId)) board.memberIds.push(memberId);
        });
      },
      toggleCardMember(cardId, memberId) {
        set((s) => {
          const card = s.cards[cardId]; if (!card) return;
          const idx = card.memberIds.indexOf(memberId);
          if (idx === -1) card.memberIds.push(memberId);
          else card.memberIds.splice(idx, 1);
          card.updatedAt = now();
        });
      },

      // ── Attachments ──────────────────────────────────────────────
      addAttachment(cardId, attachment) {
        const id = newId(); const ts = now();
        set((s) => {
          const card = s.cards[cardId]; if (!card) return;
          card.attachments.push({ id, ...attachment, addedAt: ts });
          card.updatedAt = ts;
        });
        return id;
      },
      removeAttachment(cardId, attachmentId) {
        set((s) => {
          const card = s.cards[cardId]; if (!card) return;
          card.attachments = card.attachments.filter((a) => a.id !== attachmentId);
          card.updatedAt = now();
        });
      },
      setCardCoverFromAttachment(cardId, attachmentId) {
        set((s) => {
          const card = s.cards[cardId]; if (!card) return;
          const att = card.attachments.find((a) => a.id === attachmentId);
          if (!att || att.type !== 'image') return;
          card.cover = { type: 'image', image: att.url, size: 'half' };
          card.activity.push(makeActivity({ type: 'described', text: 'set the cover from an attachment' }));
          card.updatedAt = now();
        });
      },

      // ── Workspaces ───────────────────────────────────────────────
      createWorkspace(name, shortName, color) {
        const id = newId();
        set((s) => {
          s.workspaces[id] = { id, name, shortName, color, description: '', tier: 'free', memberIds: [] };
          if (!s.activeWorkspaceId) s.activeWorkspaceId = id;
        });
        return id;
      },
      setActiveWorkspace(id) { set((s) => { s.activeWorkspaceId = id; }); },
      updateBoardVisibility(boardId, visibility) {
        set((s) => { if (s.boards[boardId]) s.boards[boardId].visibility = visibility; });
      },

      // ── Templates ────────────────────────────────────────────────
      createBoardFromTemplate(templateId, title, workspaceId) {
        const id = newId(); const ts = now();
        set((s) => {
          const template = s.boardTemplates[templateId]; if (!template) return;
          let cardNum = 1; const listIds: ID[] = [];
          for (const listDef of template.lists) {
            const listId = newId(); const cardIds: ID[] = [];
            for (const cardDef of listDef.cards) {
              const cardId = newId();
              s.cards[cardId] = {
                id: cardId, listId, title: cardDef.title, description: cardDef.description ?? '',
                number: cardNum++, memberIds: [], attachments: [],
                labelIds: [], dueDate: null, completed: false, isArchived: false,
                linkedCardIds: [],
                cover: { type: 'none', size: 'half' }, checklists: [],
                activity: [makeActivity({ type: 'created', text: `Card "${cardDef.title}" created` })],
                createdAt: ts, updatedAt: ts,
              };
              cardIds.push(cardId);
            }
            s.lists[listId] = { id: listId, boardId: id, title: listDef.title, cardIds, order: listIds.length, isArchived: false };
            listIds.push(listId);
          }
          const ws = s.workspaces[workspaceId];
          s.boards[id] = {
            id, title, background: template.background, description: '', listIds, createdAt: ts,
            memberIds: ws?.memberIds ?? [], nextCardNumber: cardNum,
            workspaceId, visibility: 'workspace',
          };
          s.activeBoardId = id;
          s.recentBoardIds = [id, ...(s.recentBoardIds ?? []).filter((r) => r !== id)].slice(0, 5);
        });
        return id;
      },
      createCardFromTemplate(templateId, listId) {
        const id = newId(); const ts = now();
        set((s) => {
          const template = s.cardTemplates[templateId]; if (!template) return;
          const list = s.lists[listId]; if (!list) return;
          const board = s.boards[list.boardId];
          const num = board?.nextCardNumber ?? 1;
          if (board) board.nextCardNumber = num + 1;
          const checklists: Checklist[] = template.checklistTemplates.map((ct) => ({
            id: newId(), title: ct.title,
            items: ct.items.map((text) => ({ id: newId(), text, completed: false, createdAt: ts })),
          }));
          s.cards[id] = {
            id, listId, title: template.title, description: template.description,
            number: num, memberIds: [], attachments: [],
            labelIds: [...(template.labelIds ?? [])],
            dueDate: null, completed: false, isArchived: false,
            linkedCardIds: [],
            cover: { type: 'none', size: 'half' }, checklists,
            activity: [makeActivity({ type: 'created', text: `Card created from template "${template.name}"` })],
            createdAt: ts, updatedAt: ts,
          };
          list.cardIds.push(id);
        });
        return id;
      },
      saveBoardAsTemplate(boardId, name) {
        const id = newId();
        set((s) => {
          const board = s.boards[boardId]; if (!board) return;
          const lists = board.listIds
            .map((lid) => s.lists[lid]).filter(Boolean).filter((l) => !l.isArchived)
            .map((list) => ({
              title: list.title,
              cards: list.cardIds
                .map((cid) => s.cards[cid]).filter(Boolean).filter((c) => !c.isArchived)
                .map((card) => ({ title: card.title, description: card.description || undefined })),
            }));
          s.boardTemplates[id] = {
            id, name, description: `Created from "${board.title}"`,
            background: board.background, category: 'personal', lists,
          };
        });
        return id;
      },
      saveCardAsTemplate(cardId, name) {
        const id = newId();
        set((s) => {
          const card = s.cards[cardId]; if (!card) return;
          s.cardTemplates[id] = {
            id, name, title: card.title, description: card.description,
            labelIds: [...card.labelIds],
            checklistTemplates: card.checklists.map((cl) => ({
              title: cl.title,
              items: cl.items.map((item) => item.text),
            })),
          };
        });
        return id;
      },

      setBoardView(boardId, view) {
        set((s) => { s.activeViewByBoard[boardId] = view; });
      },

      // ── Activity / covers / checklists ───────────────────────────
      pushActivity(cardId, entry) {
        set((s) => {
          const card = s.cards[cardId]; if (!card) return;
          card.activity.push(makeActivity(entry)); card.updatedAt = now();
        });
      },
      updateComment(cardId, commentId, newContent) {
        set((s) => {
          const card = s.cards[cardId]; if (!card) return;
          const entry = card.activity.find((a) => a.id === commentId && a.type === 'commented');
          if (!entry) return;
          entry.text = newContent;
          card.updatedAt = now();
        });
      },
      deleteComment(cardId, commentId) {
        set((s) => {
          const card = s.cards[cardId]; if (!card) return;
          card.activity = card.activity.filter((a) => !(a.id === commentId && a.type === 'commented'));
          card.updatedAt = now();
        });
      },
      updateCardCover(cardId, cover) {
        set((s) => {
          const card = s.cards[cardId]; if (!card) return;
          card.cover = cover;
          card.activity.push(makeActivity({ type: 'described', text: 'changed the cover' }));
          card.updatedAt = now();
        });
      },
      createChecklist(cardId, title) {
        const id = newId(); const ts = now();
        set((s) => {
          const card = s.cards[cardId]; if (!card) return;
          card.checklists.push({ id, title, items: [] });
          card.activity.push(makeActivity({ type: 'described', text: `Added checklist "${title}"` }));
          card.updatedAt = ts;
        });
        return id;
      },
      renameChecklist(cardId, checklistId, title) {
        set((s) => {
          const card = s.cards[cardId]; if (!card) return;
          const cl = card.checklists.find((c) => c.id === checklistId);
          if (cl) { cl.title = title; card.updatedAt = now(); }
        });
      },
      deleteChecklist(cardId, checklistId) {
        set((s) => {
          const card = s.cards[cardId]; if (!card) return;
          card.checklists = card.checklists.filter((c) => c.id !== checklistId);
          card.activity.push(makeActivity({ type: 'described', text: 'Removed a checklist' }));
          card.updatedAt = now();
        });
      },
      addChecklistItem(cardId, checklistId, text) {
        const id = newId(); const ts = now();
        set((s) => {
          const card = s.cards[cardId]; if (!card) return;
          const cl = card.checklists.find((c) => c.id === checklistId); if (!cl) return;
          cl.items.push({ id, text, completed: false, createdAt: ts });
          card.updatedAt = ts;
        });
        return id;
      },
      toggleChecklistItem(cardId, checklistId, itemId) {
        set((s) => {
          const card = s.cards[cardId]; if (!card) return;
          const item = card.checklists.find((c) => c.id === checklistId)?.items.find((i) => i.id === itemId);
          if (!item) return;
          item.completed = !item.completed;
          card.activity.push(makeActivity({ type: 'described', text: item.completed ? `Completed "${item.text}"` : `Unchecked "${item.text}"` }));
          card.updatedAt = now();
        });
        const card = boardStore.getState().cards[cardId];
        const cl = card?.checklists.find((c) => c.id === checklistId);
        if (card && cl && cl.items.length > 0 && cl.items.every((i) => i.completed)) {
          const bId = boardStore.getState().lists[card.listId]?.boardId;
          if (bId) emitBoardEvent({ type: 'checklist.completed', boardId: bId, cardId, listId: card.listId });
        }
      },
      renameChecklistItem(cardId, checklistId, itemId, text) {
        set((s) => {
          const card = s.cards[cardId]; if (!card) return;
          const item = card.checklists.find((c) => c.id === checklistId)?.items.find((i) => i.id === itemId);
          if (item) { item.text = text; card.updatedAt = now(); }
        });
      },
      deleteChecklistItem(cardId, checklistId, itemId) {
        set((s) => {
          const card = s.cards[cardId]; if (!card) return;
          const cl = card.checklists.find((c) => c.id === checklistId); if (!cl) return;
          cl.items = cl.items.filter((i) => i.id !== itemId);
          card.updatedAt = now();
        });
      },

      // ── Sidebar / starred / recent ──────────────────────────────
      toggleStarBoard(boardId) {
        set((s) => {
          const ids = s.starredBoardIds ?? [];
          const idx = ids.indexOf(boardId);
          s.starredBoardIds = idx === -1 ? [...ids, boardId] : ids.filter((id) => id !== boardId);
        });
      },
      pushRecentBoard(boardId) {
        set((s) => { s.recentBoardIds = [boardId, ...(s.recentBoardIds ?? []).filter((r) => r !== boardId)].slice(0, 5); });
      },
      toggleSidebar() { set((s) => { s.sidebarCollapsed = !s.sidebarCollapsed; }); },
      setFilter(patch) { set((s) => { Object.assign(s.filterState, patch); }); },

      // ── Archive ──────────────────────────────────────────────────
      archiveCard(cardId) {
        set((s) => {
          const card = s.cards[cardId]; if (!card) return;
          card.isArchived = true;
          card.activity.push(makeActivity({ type: 'described', text: 'archived this card' }));
          card.updatedAt = now();
        });
      },
      restoreCard(cardId) {
        set((s) => {
          const card = s.cards[cardId]; if (!card) return;
          card.isArchived = false;
          card.activity.push(makeActivity({ type: 'described', text: 'sent this card to the board' }));
          card.updatedAt = now();
        });
      },
      archiveList(listId) { set((s) => { if (s.lists[listId]) s.lists[listId].isArchived = true; }); },
      restoreList(listId) { set((s) => { if (s.lists[listId]) s.lists[listId].isArchived = false; }); },
      sortList(listId, by) {
        set((s) => {
          const list = s.lists[listId];
          if (!list) return;
          list.cardIds = [...list.cardIds].sort((a, b) => {
            const ca = s.cards[a], cb = s.cards[b];
            if (!ca || !cb) return 0;
            if (by === 'name') return ca.title.localeCompare(cb.title);
            if (by === 'due') {
              if (!ca.dueDate && !cb.dueDate) return 0;
              if (!ca.dueDate) return 1;
              if (!cb.dueDate) return -1;
              return ca.dueDate.localeCompare(cb.dueDate);
            }
            if (by === 'created-asc') return ca.createdAt.localeCompare(cb.createdAt);
            return cb.createdAt.localeCompare(ca.createdAt);
          });
        });
      },
      copyList(listId) {
        const origList = boardStore.getState().lists[listId];
        if (!origList) return '' as ID;
        const newListId = newId(); const ts = now();
        set((s) => {
          const board = s.boards[origList.boardId];
          if (!board) return;
          const newCardIds: ID[] = [];
          for (const cardId of origList.cardIds) {
            const orig = s.cards[cardId];
            if (!orig || orig.isArchived) continue;
            const newCardId = newId();
            s.cards[newCardId] = {
              ...orig, id: newCardId, listId: newListId,
              number: board.nextCardNumber++,
              checklists: orig.checklists.map((cl) => ({
                ...cl, id: newId(),
                items: cl.items.map((it) => ({ ...it, id: newId() })),
              })),
              activity: [makeActivity({ type: 'created', text: `Card "${orig.title}" copied` })],
              createdAt: ts, updatedAt: ts,
            };
            newCardIds.push(newCardId);
          }
          s.lists[newListId] = {
            id: newListId, boardId: origList.boardId,
            title: `${origList.title} Copy`,
            cardIds: newCardIds, order: board.listIds.length, isArchived: false,
          };
          board.listIds.push(newListId);
        });
        return newListId;
      },
      moveAllCards(fromListId, toListId) {
        set((s) => {
          const from = s.lists[fromListId];
          const to   = s.lists[toListId];
          if (!from || !to) return;
          const active = from.cardIds.filter((id) => !s.cards[id]?.isArchived);
          for (const cardId of active) {
            if (s.cards[cardId]) { s.cards[cardId].listId = toListId; to.cardIds.push(cardId); }
          }
          from.cardIds = from.cardIds.filter((id) => !active.includes(id));
        });
      },
      archiveAllCardsInList(listId) {
        set((s) => {
          const list = s.lists[listId]; if (!list) return;
          for (const cardId of list.cardIds) {
            if (s.cards[cardId]) s.cards[cardId].isArchived = true;
          }
        });
      },
      toggleWatchList(listId) {
        set((s) => {
          const watched = new Set(s.watchedListIds ?? []);
          if (watched.has(listId)) watched.delete(listId); else watched.add(listId);
          s.watchedListIds = [...watched];
        });
      },
      reorderListToPosition(listId, position) {
        set((s) => {
          const list = s.lists[listId]; if (!list) return;
          const board = s.boards[list.boardId]; if (!board) return;
          const ids = board.listIds.filter((id) => id !== listId);
          const clamped = Math.max(0, Math.min(position, ids.length));
          ids.splice(clamped, 0, listId);
          board.listIds = ids;
          ids.forEach((id, i) => { if (s.lists[id]) s.lists[id].order = i; });
        });
      },
      updateBoardBackground(boardId, background) {
        set((s) => { if (s.boards[boardId]) s.boards[boardId].background = background; });
      },
      updateBoardDescription(boardId, description) {
        set((s) => { if (s.boards[boardId]) s.boards[boardId].description = description; });
      },

      // ── Persistence ──────────────────────────────────────────────
      clearAll() {
        if (typeof window !== 'undefined') {
          // Clear the currently active (possibly per-user namespaced) persist key.
          const opts = (boardStore.persist as unknown as { getOptions?: () => { name?: string } }).getOptions?.();
          localStorage.removeItem(opts?.name ?? 'trello-clone-v1');
        }
        const seed = buildSeed();
        set((s) => {
          s.boards = seed.boards; s.lists = seed.lists; s.cards = seed.cards;
          s.labels = seed.labels; s.members = seed.members;
          s.workspaces = seed.workspaces; s.activeWorkspaceId = seed.activeWorkspaceId;
          s.boardTemplates = seed.boardTemplates; s.cardTemplates = seed.cardTemplates;
          s.activeViewByBoard = {};
          s.activeBoardId = seed.activeBoardId;
          s.activePanel = seed.activePanel;
          s.panelLayout = seed.panelLayout;
          s.starredBoardIds = []; s.recentBoardIds = seed.recentBoardIds;
          s.sidebarCollapsed = false; s.notifications = seed.notifications; s.selectedCardIds = [];
          s.notificationsOpen = false; s.activeCardModalId = null;
          s.jiraPromoDismissed = false; s.workspaceName = 'Trello Workspace';
          s.userName = 'deepak chandra'; s.userEmail = 'nagireddydeepakchandra@gmail.com'; s.labsEnabled = false;
          s._hasHydrated = true;
        });
      },
    })),
    {
      name: 'trello-clone-v1',
      version: 9,
      storage: safeStorage,
      partialize: (state) => ({
        boards: state.boards, lists: state.lists, cards: state.cards,
        labels: state.labels, members: state.members,
        workspaces: state.workspaces, activeWorkspaceId: state.activeWorkspaceId,
        boardTemplates: state.boardTemplates, cardTemplates: state.cardTemplates,
        activeViewByBoard: state.activeViewByBoard,
        activeBoardId: state.activeBoardId,
        activePanel: state.activePanel,
        panelLayout: state.panelLayout,
        inboxWidth: state.inboxWidth, plannerWidth: state.plannerWidth,
        inboxCards: state.inboxCards,
        calendarViewDate: state.calendarViewDate, calendarGranularity: state.calendarGranularity,
        starredBoardIds: state.starredBoardIds, recentBoardIds: state.recentBoardIds,
        sidebarCollapsed: state.sidebarCollapsed,
        jiraPromoDismissed: state.jiraPromoDismissed, workspaceName: state.workspaceName,
        userName: state.userName, userEmail: state.userEmail, labsEnabled: state.labsEnabled,
      }),
      migrate: (persisted, _version) => {
        if (typeof persisted === 'object' && persisted !== null) {
          const p = persisted as Record<string, unknown> & {
            cards?: Record<string, Record<string, unknown>>;
            lists?: Record<string, Record<string, unknown>>;
            boards?: Record<string, Record<string, unknown>>;
            members?: Record<string, unknown>;
            workspaces?: Record<string, unknown>;
            boardTemplates?: Record<string, unknown>;
            cardTemplates?: Record<string, unknown>;
            starredBoardIds?: unknown; recentBoardIds?: unknown;
            sidebarCollapsed?: unknown; activeBoardId?: string | null;
            activePanel?: unknown;
            activeWorkspaceId?: string | null;
            linkedCardIds?: unknown;
          };
          for (const id of Object.keys(p.cards ?? {})) {
            if (!p.cards![id].cover)       p.cards![id].cover       = { type: 'none', size: 'half' };
            if (!p.cards![id].checklists)  p.cards![id].checklists  = [];
            if (p.cards![id].isArchived === undefined) p.cards![id].isArchived = false;
            if (!p.cards![id].memberIds)   p.cards![id].memberIds   = [];
            if (!p.cards![id].attachments) p.cards![id].attachments = [];
            if (!p.cards![id].linkedCardIds) p.cards![id].linkedCardIds = [];
            if (p.cards![id].number === undefined) p.cards![id].number = 0;
          }
          for (const id of Object.keys(p.lists ?? {})) {
            if (p.lists![id].isArchived === undefined) p.lists![id].isArchived = false;
          }
          for (const id of Object.keys(p.boards ?? {})) {
            if (p.boards![id].description === undefined)    p.boards![id].description    = '';
            if (!p.boards![id].memberIds)                   p.boards![id].memberIds      = [];
            if (p.boards![id].nextCardNumber === undefined) p.boards![id].nextCardNumber = 1;
            if (!p.boards![id].workspaceId)                 p.boards![id].workspaceId    = '';
            if (!p.boards![id].visibility)                  p.boards![id].visibility     = 'workspace';
          }
          if (!p.starredBoardIds)      p.starredBoardIds      = [];
          if (!p.recentBoardIds)       p.recentBoardIds       = p.activeBoardId ? [p.activeBoardId] : [];
          if (p.sidebarCollapsed === undefined) p.sidebarCollapsed = false;
          if (!p.members)              p.members              = {};
          if (!p.workspaces)           p.workspaces           = {};
          if (!p.boardTemplates)       p.boardTemplates       = {};
          if (!p.cardTemplates)        p.cardTemplates        = {};
          if (p.activeWorkspaceId === undefined) p.activeWorkspaceId = null;
          if (!p.activeViewByBoard) p.activeViewByBoard = {};
          if (p.activePanel !== 'board' && p.activePanel !== 'inbox' && p.activePanel !== 'planner') p.activePanel = 'board';
        }
        return persisted;
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        const isEmpty = Object.keys(state.boards).length === 0;
        if (isEmpty) {
          const seed = buildSeed();
          state.boards = seed.boards; state.lists = seed.lists;
          state.cards = seed.cards; state.labels = seed.labels;
          state.members = seed.members;
          state.workspaces = seed.workspaces; state.activeWorkspaceId = seed.activeWorkspaceId;
          state.boardTemplates = seed.boardTemplates; state.cardTemplates = seed.cardTemplates;
          state.activeBoardId = seed.activeBoardId;
          state.activePanel = seed.activePanel;
          state.notifications = seed.notifications;
          state.selectedCardIds = [];
        } else {
          // Seed members if missing
          if (!state.members || Object.keys(state.members).length === 0) {
            const { members, memberIds } = buildMembers();
            state.members = members;
            for (const board of Object.values(state.boards)) {
              if (!board.memberIds || board.memberIds.length === 0) board.memberIds = memberIds.slice(0, 4);
            }
          }

          // Seed workspaces if missing
          if (!state.workspaces || Object.keys(state.workspaces).length === 0) {
            const allMemberIds = Object.keys(state.members);
            const { workspaces, ws1Id } = buildWorkspaces(allMemberIds);
            state.workspaces = workspaces;
            state.activeWorkspaceId = ws1Id;
            for (const board of Object.values(state.boards)) {
              if (!board.workspaceId) board.workspaceId = ws1Id;
              if (!board.visibility)  board.visibility  = 'workspace';
            }
          }

          // Seed templates if missing
          if (!state.boardTemplates || Object.keys(state.boardTemplates).length === 0)
            state.boardTemplates = buildBoardTemplates();
          if (!state.cardTemplates || Object.keys(state.cardTemplates).length === 0)
            state.cardTemplates = buildCardTemplates();

          // Migrate card numbers per board
          for (const board of Object.values(state.boards)) {
            const allCardIds: ID[] = [];
            for (const listId of board.listIds) {
              const list = state.lists[listId];
              if (list) allCardIds.push(...list.cardIds);
            }
            const needsNumbers = allCardIds.some((id) => !state.cards[id]?.number);
            if (needsNumbers || !board.nextCardNumber) {
              const sorted = allCardIds.map((id) => state.cards[id]).filter(Boolean)
                .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
              let num = 1;
              for (const card of sorted) {
                if (!card.number) card.number = num; else num = Math.max(num, card.number);
                num++;
              }
              board.nextCardNumber = num;
            }
          }

          // Ensure card arrays exist
          for (const card of Object.values(state.cards)) {
            if (!card.memberIds)   card.memberIds   = [];
            if (!card.attachments) card.attachments = [];
            if (!card.linkedCardIds) card.linkedCardIds = [];
          }
        }

        if (!state.activeWorkspaceId) {
          const firstWs = Object.keys(state.workspaces)[0];
          if (firstWs) state.activeWorkspaceId = firstWs;
        }

        if (!state.activeViewByBoard) state.activeViewByBoard = {};
        if (state.activePanel !== 'board' && state.activePanel !== 'inbox' && state.activePanel !== 'planner') state.activePanel = 'board';
        if (!state.notifications) state.notifications = buildSeed().notifications;
        if (!state.selectedCardIds) state.selectedCardIds = [];
        if (state.notificationsOpen === undefined) state.notificationsOpen = false;
        if (state.activeCardModalId === undefined) state.activeCardModalId = null;
        if (state.jiraPromoDismissed === undefined) state.jiraPromoDismissed = false;
        if (!state.workspaceName) state.workspaceName = 'Trello Workspace';
        if (!state.userName) state.userName = 'deepak chandra';
        if (state.userEmail === undefined) state.userEmail = 'nagireddydeepakchandra@gmail.com';
        if (state.labsEnabled === undefined) state.labsEnabled = false;
        state._hasHydrated = true;
      },
    },
  ),
);

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useBoardStore<T>(selector: (state: Store) => T): T { return useStore(boardStore, selector); }
export function useHasHydrated(): boolean { return useStore(boardStore, (s) => s._hasHydrated); }
export const useInboxOpen = () => useStore(boardStore, (s) => s.inboxOpen);
export const useSwitchBoardsOpen = () => useStore(boardStore, (s) => s.switchBoardsOpen);
