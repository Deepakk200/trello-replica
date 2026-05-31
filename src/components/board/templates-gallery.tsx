'use client';

import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { useBoardStore } from '@/store/use-board-store';
import type { BoardTemplate } from '@/types';

const CATEGORIES = ['All', 'Engineering', 'Marketing', 'Design', 'Personal', 'Education'] as const;
type Cat = typeof CATEGORIES[number];

const TEMPLATE_BG_CLASS: Record<string, string> = {
  'linear-gradient(135deg,#0079bf,#5067c5)': 'bg-[linear-gradient(135deg,#0079bf,#5067c5)]',
  'linear-gradient(135deg,#d29034,#e67e22)': 'bg-[linear-gradient(135deg,#d29034,#e67e22)]',
  'linear-gradient(135deg,#519839,#70a246)': 'bg-[linear-gradient(135deg,#519839,#70a246)]',
  'linear-gradient(135deg,#b04632,#e74c3c)': 'bg-[linear-gradient(135deg,#b04632,#e74c3c)]',
  'linear-gradient(135deg,#89609e,#8e44ad)': 'bg-[linear-gradient(135deg,#89609e,#8e44ad)]',
  'linear-gradient(135deg,#1d6fa4,#27ae60)': 'bg-[linear-gradient(135deg,#1d6fa4,#27ae60)]',
};

export function TemplatesGallery({ onClose }: { onClose: () => void }) {
  const { boardTemplates, workspaces, activeWorkspaceId } = useBoardStore(
    useShallow((s) => ({
      boardTemplates: s.boardTemplates,
      workspaces: s.workspaces,
      activeWorkspaceId: s.activeWorkspaceId,
    })),
  );
  const createBoardFromTemplate = useBoardStore((s) => s.createBoardFromTemplate);

  const [cat, setCat]                       = useState<Cat>('All');
  const [selected, setSelected]             = useState<BoardTemplate | null>(null);
  const [title, setTitle]                   = useState('');
  const [wsId, setWsId]                     = useState(activeWorkspaceId ?? '');

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const all = Object.values(boardTemplates);
  const filtered = cat === 'All' ? all : all.filter((t) => t.category === cat.toLowerCase());
  const catCounts: Record<string, number> = { All: all.length };
  for (const t of all) catCounts[t.category] = (catCounts[t.category] ?? 0) + 1;

  function handleCreate() {
    if (!selected || !title.trim()) return;
    createBoardFromTemplate(selected.id, title.trim(), wsId || activeWorkspaceId!);
    onClose();
  }

  const modal = (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} aria-hidden="true" />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-225 max-w-[95vw] max-h-[80vh] flex flex-col bg-trello-surfaceOverlay rounded-xl shadow-2xl z-50 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-trello-borderSubtle shrink-0">
          <h2 className="text-base font-semibold text-trello-text">Board templates</h2>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-trello-cardHover text-trello-textSubtle transition-colors" title="Close templates" aria-label="Close templates">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Category sidebar */}
          <aside className="w-44 shrink-0 border-r border-trello-borderSubtle p-3 overflow-y-auto">
            {CATEGORIES.map((c) => {
              const key = c === 'All' ? 'All' : c.toLowerCase();
              const count = catCounts[key] ?? 0;
              return (
                <button
                  key={c}
                  onClick={() => { setCat(c); setSelected(null); }}
                  className={`w-full text-left flex items-center justify-between px-2 py-1.5 rounded text-sm transition-colors mb-0.5 ${
                    cat === c
                      ? 'bg-trello-accent/20 text-trello-accent font-medium'
                      : 'text-trello-text hover:bg-trello-cardHover'
                  }`}
                >
                  {c}
                  <span className="text-xs text-trello-textSubtle">{count}</span>
                </button>
              );
            })}
          </aside>

          {/* Main content */}
          <div className="flex-1 overflow-y-auto p-5">
            {selected ? (
              /* Creation sub-form */
              <div className="max-w-sm mx-auto mt-6">
                <div className={`h-32 rounded-xl mb-4 ${TEMPLATE_BG_CLASS[selected.background] ?? 'bg-trello-cardHover'}`} />
                <h3 className="font-semibold text-trello-text mb-1">{selected.name}</h3>
                <p className="text-sm text-trello-textSubtle mb-4">{selected.description}</p>
                <label className="text-xs text-trello-textSubtle block mb-1">Board title</label>
                <input
                  autoFocus
                  placeholder={selected.name}
                  className="w-full bg-trello-cardBg border border-trello-borderSubtle focus:border-trello-accent rounded px-2 py-1.5 text-sm text-trello-text outline-none mb-3 transition-colors"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setSelected(null); }}
                />
                <label className="text-xs text-trello-textSubtle block mb-1">Workspace</label>
                <select
                  title="Workspace"
                  className="w-full bg-trello-cardBg border border-trello-borderSubtle rounded px-2 py-1.5 text-sm text-trello-text outline-none mb-4"
                  value={wsId}
                  onChange={(e) => setWsId(e.target.value)}
                >
                  {Object.values(workspaces).map((ws) => (
                    <option key={ws.id} value={ws.id}>{ws.name}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button onClick={handleCreate} className="flex-1 btn-primary py-2 text-sm font-medium">Create board</button>
                  <button onClick={() => setSelected(null)} className="px-4 btn-ghost py-2 text-sm">Back</button>
                </div>
              </div>
            ) : (
              /* Template grid */
              <div className="grid grid-cols-3 gap-4">
                {filtered.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setSelected(t); setTitle(t.name); }}
                    className={`group relative h-32 rounded-xl overflow-hidden text-left focus:outline-none focus:ring-2 focus:ring-trello-accent ${TEMPLATE_BG_CLASS[t.background] ?? 'bg-trello-cardHover'}`}
                  >
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
                    <div className="absolute inset-0 p-3 flex flex-col justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-white/80 bg-black/30 px-1.5 py-0.5 rounded w-fit">
                        {t.category}
                      </span>
                      <p className="text-sm font-semibold text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">{t.name}</p>
                    </div>
                    <div className="absolute inset-x-3 bottom-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-trello-primary text-white text-xs font-medium text-center py-1.5 rounded">
                        Use template
                      </div>
                    </div>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="col-span-3 text-center py-12 text-trello-textSubtle text-sm">
                    No templates in this category
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modal, document.body);
}
