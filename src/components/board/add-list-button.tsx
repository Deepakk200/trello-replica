'use client';

import { useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useBoardStore } from '@/store/use-board-store';
import type { ID } from '@/types';

export function AddListButton({ boardId }: { boardId: ID }) {
  const createList = useBoardStore((s) => s.createList);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function openForm() {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function close() {
    setOpen(false);
    setTitle('');
  }

  function submit() {
    const t = title.trim();
    if (t) createList(boardId, t);
    close();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') submit();
    if (e.key === 'Escape') close();
  }

  if (!open) {
    return (
      <button
        onClick={openForm}
        className="w-72 shrink-0 h-10 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm flex items-center px-3 gap-2 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add another list
      </button>
    );
  }

  return (
    <div className="w-72 shrink-0 bg-[#101204] rounded-xl p-2 flex flex-col gap-2">
      <input
        ref={inputRef}
        className="w-full bg-white text-slate-900 rounded px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
        placeholder="Enter list name…"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={onKeyDown}
      />
      <div className="flex items-center gap-2">
        <button
          onClick={submit}
          className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded font-medium transition-colors"
        >
          Add list
        </button>
        <button
          onClick={close}
          className="p-1 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          aria-label="Cancel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
