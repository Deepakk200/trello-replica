'use client';

import { useEffect, useRef } from 'react';
import { useBoardStore } from '@/store/use-board-store';
import type { ID } from '@/types';

export function CardTemplatePicker({ listId, onClose }: { listId: ID; onClose: () => void }) {
  const cardTemplates          = useBoardStore((s) => s.cardTemplates);
  const createCardFromTemplate = useBoardStore((s) => s.createCardFromTemplate);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [onClose]);

  const templates = Object.values(cardTemplates);

  if (templates.length === 0) {
    return (
      <div
        ref={ref}
        className="absolute bottom-full mb-1 left-0 w-56 bg-trello-surfaceRaised border border-trello-border rounded-lg shadow-xl z-50 p-4"
      >
        <p className="text-xs text-trello-textSubtle text-center">No card templates yet.</p>
        <p className="text-xs text-trello-textSubtle text-center mt-0.5">
          Save a card as template from its modal.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="absolute bottom-full mb-1 left-0 w-56 bg-trello-surfaceRaised border border-trello-border rounded-lg shadow-xl z-50 overflow-hidden"
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-trello-textSubtle px-3 pt-2.5 pb-1">
        Card templates
      </p>
      {templates.map((t) => (
        <button
          key={t.id}
          onClick={() => { createCardFromTemplate(t.id, listId); onClose(); }}
          className="w-full text-left px-3 py-2 hover:bg-trello-cardHover transition-colors"
        >
          <p className="text-sm font-medium text-trello-text">{t.name}</p>
          <p className="text-xs text-trello-textSubtle truncate">{t.title || '(no title prefix)'}</p>
        </button>
      ))}
    </div>
  );
}
