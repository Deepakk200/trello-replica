'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useBoardStore } from '@/store/use-board-store';
import type { ID } from '@/types';

interface Props { listId: ID; open: boolean; onOpen: () => void; onClose: () => void; }

export function ListFooter({ listId, open, onOpen, onClose }: Props) {
  const createCard  = useBoardStore((s) => s.createCard);
  const [title, setTitle] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wrapperRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => textareaRef.current?.focus(), 0);
    else setTitle('');
  }, [open]);

  // Close when clicking outside the footer area
  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open, onClose]);

  function submit() {
    const t = title.trim();
    if (!t) return;
    createCard(listId, t);
    setTitle('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
    if (e.key === 'Escape') onClose();
  }

  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }

  return (
    <div ref={wrapperRef} className="px-1.5 pb-1.5 pt-1">
      {!open ? (
        <button
          onClick={onOpen}
          className="w-full flex items-center gap-2 px-2.5 py-2 md:py-1.5 min-h-[44px] md:min-h-0 rounded-lg text-sm text-[var(--text-subtle,#8C9BAB)] hover:bg-white/10 hover:text-[var(--text-primary,#B6C2CF)] transition-colors"
        >
          <Plus className="h-4 w-4 shrink-0" />
          Add a card
        </button>
      ) : (
        <div className="space-y-1.5">
          <textarea
            ref={textareaRef}
            rows={2}
            className="w-full bg-[var(--card-bg,#22272B)] text-[var(--text-primary)] text-sm rounded-lg px-3 py-2 resize-none outline-none ring-1 ring-[var(--accent,#579DFF)] focus:ring-2 focus:ring-[var(--accent,#579DFF)] placeholder:text-[var(--text-subtle)] leading-snug"
            placeholder="Enter a title or paste a link…"
            value={title}
            onChange={(e) => { setTitle(e.target.value); autoResize(e.target); }}
            onKeyDown={onKeyDown}
          />
          <div className="flex items-center gap-1.5">
            <button
              onClick={submit}
              className="bg-[var(--primary,#1D7AFC)] hover:bg-[var(--primary-hover,#388BFF)] text-white text-sm font-medium h-8 px-3 rounded-md transition-colors"
            >
              Add card
            </button>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-md hover:bg-white/10 flex items-center justify-center transition-colors"
              aria-label="Cancel"
            >
              <X className="h-4 w-4 text-[var(--text-subtle)]" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
