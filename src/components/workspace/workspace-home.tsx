'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, ArrowUpRight, Lock, Pencil, Plus, Sparkles, User, X } from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { useBoardStore, useHasHydrated } from '@/store/use-board-store';
import { boardPath } from '@/lib/slug';
import { ClosedBoardsModal } from './closed-boards-modal';

const SWATCHES = [
  'linear-gradient(135deg,#0079bf,#5067c5)',
  'linear-gradient(135deg,#d29034,#f5a623)',
  'linear-gradient(135deg,#519839,#4bce97)',
  'linear-gradient(135deg,#b04632,#e2483d)',
  '#026aa7',
  '#89609e',
];

const TEMPLATE_CARDS: { title: string; bg: string }[] = [
  { title: 'Project Management', bg: 'linear-gradient(135deg,#0C66E4,#1D7AFC)' },
  { title: 'Scrum', bg: 'linear-gradient(135deg,#1D7AFC,#22A6E8)' },
  { title: 'Bug Tracking', bg: 'linear-gradient(135deg,#0C66E4,#0B8DDE)' },
  { title: 'Web Design Process', bg: 'linear-gradient(135deg,#1457C4,#1D7AFC)' },
];

function MiniScreenshot() {
  return (
    <svg viewBox="0 0 120 60" className="w-full h-full opacity-30" aria-hidden="true">
      <rect x="4" y="6" width="32" height="48" rx="3" fill="white" fillOpacity="0.5" />
      <rect x="42" y="6" width="32" height="48" rx="3" fill="white" fillOpacity="0.5" />
      <rect x="80" y="6" width="32" height="48" rx="3" fill="white" fillOpacity="0.5" />
      <rect x="8" y="12" width="24" height="6" rx="2" fill="white" fillOpacity="0.8" />
      <rect x="8" y="22" width="20" height="6" rx="2" fill="white" fillOpacity="0.8" />
      <rect x="46" y="12" width="24" height="6" rx="2" fill="white" fillOpacity="0.8" />
      <rect x="84" y="12" width="24" height="6" rx="2" fill="white" fillOpacity="0.8" />
      <rect x="84" y="22" width="18" height="6" rx="2" fill="white" fillOpacity="0.8" />
    </svg>
  );
}

export function WorkspaceHome() {
  const router = useRouter();
  const hydrated = useHasHydrated();

  const { boards, jiraPromoDismissed, workspaceName } = useBoardStore(
    useShallow((s) => ({
      boards: s.boards,
      jiraPromoDismissed: s.jiraPromoDismissed,
      workspaceName: s.workspaceName,
    })),
  );
  const setActiveBoard = useBoardStore((s) => s.setActiveBoard);
  const createBoard = useBoardStore((s) => s.createBoard);
  const setJiraPromoDismissed = useBoardStore((s) => s.setJiraPromoDismissed);
  const setWorkspaceName = useBoardStore((s) => s.setWorkspaceName);

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBg, setNewBg] = useState(SWATCHES[0]);
  const [closedOpen, setClosedOpen] = useState(false);

  const boardList = Object.values(boards).filter((b) => !b.isArchived);
  const closedCount = Object.values(boards).filter((b) => b.isArchived).length;

  function openBoard(id: string) {
    setActiveBoard(id);
    router.push(boardPath(id, boards[id]?.title ?? ''));
  }

  function handleCreate() {
    const t = newTitle.trim();
    if (!t) return;
    const id = createBoard(t, newBg);
    setNewTitle('');
    setNewBg(SWATCHES[0]);
    setCreating(false);
    setActiveBoard(id);
    router.push(boardPath(id, t));
  }

  function startEditName() {
    setNameDraft(workspaceName);
    setEditingName(true);
  }
  function commitName() {
    setWorkspaceName(nameDraft);
    setEditingName(false);
  }

  if (!hydrated) {
    return (
      <div className="px-6 py-6 md:px-10">
        <div className="h-16 w-64 rounded-lg bg-white/5 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="px-6 py-6 md:px-10 max-w-[1100px]">
      {/* Workspace header */}
      <div className="flex items-center gap-4 mb-6">
        <div
          className="rounded-lg flex items-center justify-center text-white text-2xl font-bold flex-shrink-0"
          style={{ width: 60, height: 60, background: 'linear-gradient(135deg,#22A06B,#1A7A4F)' }}
        >
          T
        </div>
        <div>
          <div className="flex items-center gap-2">
            {editingName ? (
              <input
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={commitName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitName();
                  if (e.key === 'Escape') setEditingName(false);
                }}
                className="text-xl font-bold text-white bg-white/10 rounded px-2 py-0.5 outline-none focus:ring-2 focus:ring-[#579DFF]"
              />
            ) : (
              <>
                <h1 className="text-xl font-bold text-white">{workspaceName}</h1>
                <button
                  onClick={startEditName}
                  className="text-white/50 hover:text-white transition-colors"
                  aria-label="Edit workspace name"
                >
                  <Pencil size={15} />
                </button>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-white/60 mt-0.5">
            <span>Premium</span>
            <span className="flex items-center gap-1">
              <Lock size={12} /> Private
            </span>
          </div>
        </div>
      </div>
      <div className="border-t border-white/[0.08] mb-6" />

      {/* Jira promo / templates banner */}
      {!jiraPromoDismissed && (
        <div className="mb-8 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="flex items-center gap-1.5 text-base font-semibold text-white">
                <Sparkles size={16} className="text-[#579DFF]" /> Jira
              </h3>
              <p className="text-sm text-white/60 mt-1 max-w-xl">
                Start with a template and let Jira handle the rest with customizable workflows
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button className="h-8 px-3 rounded text-sm font-medium text-white" style={{ background: '#0C66E4' }}>
                Try it free
              </button>
              <button
                onClick={() => setJiraPromoDismissed(true)}
                className="p-1.5 rounded text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {TEMPLATE_CARDS.map((tpl) => (
              <button
                key={tpl.title}
                className="group relative h-28 rounded-lg p-3 text-left overflow-hidden transition-transform hover:scale-[1.02]"
                style={{ background: tpl.bg }}
              >
                <span className="relative z-10 text-sm font-bold text-white leading-tight block max-w-[80%]">
                  {tpl.title}
                </span>
                <div className="absolute inset-x-0 bottom-0 h-14 px-2">
                  <MiniScreenshot />
                </div>
                <ArrowUpRight
                  size={16}
                  className="absolute bottom-2 right-2 z-10 text-white/80 group-hover:text-white"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Your boards */}
      <div className="flex items-center gap-2 mb-4">
        <User size={18} className="text-white/70" />
        <h2 className="text-base font-semibold text-white">Your boards</h2>
        {closedCount > 0 && (
          <button
            onClick={() => setClosedOpen(true)}
            className="ml-auto inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white hover:bg-white/10 px-2.5 py-1 rounded transition-colors"
          >
            <Archive size={14} /> View all closed boards ({closedCount})
          </button>
        )}
      </div>
      {closedOpen && <ClosedBoardsModal onClose={() => setClosedOpen(false)} />}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {boardList.map((board) => (
          <button
            key={board.id}
            onClick={() => openBoard(board.id)}
            className="group rounded-lg overflow-hidden text-left hover:ring-2 hover:ring-white/20 transition-all"
          >
            <div className="h-24 w-full" style={{ background: board.background }} />
            <div className="px-1 py-2">
              <span className="text-sm text-white font-medium truncate block">{board.title}</span>
            </div>
          </button>
        ))}

        {/* Create new board tile */}
        {creating ? (
          <div className="rounded-lg bg-white/5 p-3 flex flex-col gap-2">
            <input
              autoFocus
              placeholder="Board title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') { setCreating(false); setNewTitle(''); }
              }}
              className="w-full bg-white/10 rounded px-2 py-1.5 text-sm text-white outline-none focus:ring-1 focus:ring-[#579DFF] placeholder:text-white/40"
            />
            <div className="flex gap-1.5">
              {SWATCHES.map((sw) => (
                <button
                  key={sw}
                  onClick={() => setNewBg(sw)}
                  className={`h-6 flex-1 rounded transition-transform ${newBg === sw ? 'ring-2 ring-white' : 'hover:scale-105'}`}
                  style={{ background: sw }}
                  aria-label="Background"
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={handleCreate} className="flex-1 py-1.5 rounded text-sm font-medium text-white" style={{ background: '#0C66E4' }}>
                Create
              </button>
              <button
                onClick={() => { setCreating(false); setNewTitle(''); }}
                className="px-3 py-1.5 rounded text-sm text-white/70 hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="h-[120px] rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center gap-1.5 text-sm text-white/60 transition-colors"
          >
            <Plus size={16} /> Create new board
          </button>
        )}
      </div>
    </div>
  );
}
