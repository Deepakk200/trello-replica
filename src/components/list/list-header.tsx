'use client';

import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { useBoardStore } from '@/store/use-board-store';
import type { ID } from '@/types';
import { ListMenu } from './list-menu';

interface Props { listId: ID; onAddCard: () => void; }

export function ListHeader({ listId, onAddCard }: Props) {
  const list = useBoardStore((s) => s.lists[listId]);
  const renameList = useBoardStore((s) => s.renameList);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuContainerRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click — wraps both button + dropdown so toggle doesn't double-fire
  useEffect(() => {
    if (!menuOpen) return;
    function handler(e: MouseEvent) {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  if (!list) return null;

  function startEdit() {
    setDraft(list.title);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  function commit() {
    const t = draft.trim();
    if (t && t !== list.title) renameList(listId, t);
    setEditing(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') setEditing(false);
  }

  return (
    <div className="px-3 pt-2 pb-1 flex items-center justify-between">
      {editing ? (
        <input
          ref={inputRef}
          autoFocus
          title="List title"
          className="flex-1 bg-white text-slate-900 rounded px-1.5 py-0.5 text-sm font-semibold outline-none"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={onKeyDown}
        />
      ) : (
        <h2
          onClick={startEdit}
          className="flex-1 text-sm font-semibold text-white cursor-pointer px-1.5 py-0.5 rounded hover:bg-white/10 transition-colors"
        >
          {list.title}
        </h2>
      )}

      <div ref={menuContainerRef} className="relative ml-1">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="p-1 rounded hover:bg-white/10 transition-colors text-white/70 hover:text-white"
          aria-label="List actions"
          title="List actions"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
        {menuOpen && (
          <ListMenu
            listId={listId}
            onClose={() => setMenuOpen(false)}
            onAddCard={() => { onAddCard(); setMenuOpen(false); }}
          />
        )}
      </div>
    </div>
  );
}
