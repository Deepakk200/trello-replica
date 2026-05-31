'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Plus, X } from 'lucide-react';
import { useBoardStore } from '@/store/use-board-store';
import { CardTemplatePicker } from '@/components/card/card-template-picker';
import type { ID } from '@/types';

interface Props { listId: ID; open: boolean; onOpen: () => void; onClose: () => void; }

export function ListFooter({ listId, open, onOpen, onClose }: Props) {
  const createCard = useBoardStore((s) => s.createCard);
  const [title, setTitle]           = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 0);
    } else {
      setTitle('');
    }
  }, [open]);

  function submit() {
    const t = title.trim();
    if (t) {
      createCard(listId, t);
      setTitle('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        setTimeout(() => textareaRef.current?.focus(), 0);
      }
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
    if (e.key === 'Escape') onClose();
  }

  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }

  if (!open) {
    return (
      <div className="px-2 pb-2 pt-1 relative">
        <div className="flex items-center gap-0.5">
          <button
            onClick={onOpen}
            className="flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-white/70 hover:bg-white/10 hover:text-white text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add a card
          </button>
          <button
            onClick={() => setShowPicker((v) => !v)}
            className="p-1.5 rounded-lg text-white/50 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Card templates"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
        {showPicker && (
          <CardTemplatePicker listId={listId} onClose={() => setShowPicker(false)} />
        )}
      </div>
    );
  }

  return (
    <div className="px-2 pb-2 pt-1 flex flex-col gap-2">
      <textarea
        ref={textareaRef}
        rows={1}
        className="w-full bg-white text-slate-900 rounded-lg px-3 py-2 text-sm outline-none resize-none focus:ring-2 focus:ring-blue-400 leading-5"
        placeholder="Enter a title or paste a link…"
        value={title}
        onChange={(e) => { setTitle(e.target.value); autoResize(e.target); }}
        onKeyDown={onKeyDown}
      />
      <div className="flex items-center gap-2">
        <button
          onClick={submit}
          className="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white text-sm rounded font-medium transition-colors"
        >
          Add card
        </button>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          aria-label="Cancel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
