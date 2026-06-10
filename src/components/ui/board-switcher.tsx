'use client';

import { useEffect, useRef, useState } from 'react';
import { LayoutGrid, Plus, X } from 'lucide-react';
import { useBoardStore } from '@/store/use-board-store';
import { EmptyState } from './empty-state';

const SWATCHES = [
  { value: 'linear-gradient(135deg,#0079bf,#5067c5)', label: 'Ocean' },
  { value: 'linear-gradient(135deg,#d29034,#f5a623)', label: 'Sunset' },
  { value: 'linear-gradient(135deg,#519839,#4bce97)', label: 'Forest' },
  { value: 'linear-gradient(135deg,#b04632,#e2483d)', label: 'Cherry' },
  { value: '#026aa7',                                  label: 'Sky'    },
  { value: '#89609e',                                  label: 'Grape'  },
];

export function BoardSwitcher() {
  const boards = useBoardStore((s) => s.boards);
  const activeBoardId = useBoardStore((s) => s.activeBoardId);
  const setActiveBoard = useBoardStore((s) => s.setActiveBoard);
  const createBoard = useBoardStore((s) => s.createBoard);

  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBg, setNewBg] = useState(SWATCHES[0].value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  function handleCreate() {
    const t = newTitle.trim();
    if (!t) return;
    createBoard(t, newBg);
    setNewTitle('');
    setNewBg(SWATCHES[0].value);
    setCreating(false);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 h-7 rounded bg-white/10 hover:bg-white/20 text-sm font-medium transition-colors"
      >
        <LayoutGrid className="w-3.5 h-3.5" />
        Boards
      </button>

      {open && (
        <div className="absolute left-0 top-9 w-72 bg-trello-surfaceRaised rounded-xl shadow-2xl border border-trello-border z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-trello-border">
            <span className="text-sm font-semibold">Your boards</span>
            <button
              onClick={() => { setOpen(false); setCreating(false); }}
              className="text-white/50 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto">
            {Object.values(boards).map((board) => (
              <button
                key={board.id}
                onClick={() => { setActiveBoard(board.id); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 transition-colors text-left ${activeBoardId === board.id ? 'bg-white/10' : ''}`}
              >
                <span
                  className="w-8 h-6 rounded shrink-0"
                  style={{ background: board.background }}
                />
                <span className="text-sm truncate flex-1">{board.title}</span>
                {activeBoardId === board.id && (
                  <span className="text-blue-400 text-xs">✓</span>
                )}
              </button>
            ))}

            {Object.keys(boards).length === 0 && !creating && (
              <EmptyState
                title="No boards yet"
                subtitle="Create a board to start organising your work with your team."
                action={
                  <button
                    onClick={() => setCreating(true)}
                    className="bg-primary text-primary-foreground text-sm px-4 py-2 rounded-lg"
                  >
                    Create your first board
                  </button>
                }
              />
            )}
          </div>

          {creating ? (
            <div className="p-3 border-t border-white/10 flex flex-col gap-2">
              <input
                autoFocus
                className="w-full bg-white/10 rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-400 placeholder:text-white/40"
                placeholder="Board title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                  if (e.key === 'Escape') setCreating(false);
                }}
              />
              <div className="flex gap-1.5">
                {SWATCHES.map((s) => (
                  <button
                    key={s.value}
                    title={s.label}
                    onClick={() => setNewBg(s.value)}
                    className={`w-8 h-6 rounded transition-transform ${newBg === s.value ? 'ring-2 ring-white scale-110' : 'hover:scale-105'}`}
                    style={{ background: s.value }}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreate}
                  className="flex-1 py-1.5 bg-blue-500 hover:bg-blue-600 rounded text-sm font-medium transition-colors"
                >
                  Create
                </button>
                <button
                  onClick={() => setCreating(false)}
                  className="px-3 py-1.5 hover:bg-white/10 rounded text-sm text-white/70 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              data-create-board
              onClick={() => setCreating(true)}
              className="w-full flex items-center gap-2 px-4 py-3 border-t border-white/10 hover:bg-white/10 transition-colors text-sm text-white/70 hover:text-white"
            >
              <Plus className="w-4 h-4" />
              Create new board
            </button>
          )}
        </div>
      )}
    </div>
  );
}
