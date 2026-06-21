'use client';

import { useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { useBoardStore } from '@/store/use-board-store';
import type { ID } from '@/types';

/**
 * Copy-with-options dialog: pick a new title, target list/position, and which parts
 * to keep (checklists / labels / members / dates). Creates an INDEPENDENT card via
 * the store's `copyCard` (fresh ids), so editing the copy never touches the source.
 */
export function CopyCardPopover({ cardId, onClose, onCopied }: {
  cardId: ID;
  onClose: () => void;
  onCopied?: (newCardId: ID) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const card    = useBoardStore((s) => s.cards[cardId]);
  const copyCard = useBoardStore((s) => s.copyCard);
  const lists = useBoardStore(useShallow((s) => {
    const c = s.cards[cardId];
    const board = c ? s.boards[s.lists[c.listId]?.boardId ?? ''] : undefined;
    return (board?.listIds ?? [])
      .map((id) => s.lists[id])
      .filter((l): l is NonNullable<typeof l> => !!l && !l.isArchived)
      .map((l) => ({ id: l.id, title: l.title, count: l.cardIds.length }));
  }));

  const [title, setTitle]                 = useState(card?.title ?? '');
  const [toListId, setToListId]           = useState<ID>(card?.listId ?? '');
  const [keepChecklists, setKeepChecklists] = useState(true);
  const [keepLabels, setKeepLabels]       = useState(true);
  const [keepMembers, setKeepMembers]     = useState(true);
  const [keepDates, setKeepDates]         = useState(true);
  const [keepAttachments, setKeepAttachments] = useState(true);
  const [keepComments, setKeepComments]   = useState(false);

  useEffect(() => {
    function onDown(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  if (!card) return null;

  const hasChecklists  = card.checklists.length > 0;
  const hasLabels      = card.labelIds.length > 0;
  const hasMembers     = card.memberIds.length > 0;
  const hasDates       = !!card.dueDate || !!card.startDate;
  const hasAttachments = card.attachments.length > 0;
  const hasComments    = card.activity.some((a) => a.type === 'commented');
  const showKeep = hasChecklists || hasLabels || hasMembers || hasDates || hasAttachments || hasComments;

  function submit() {
    const newId = copyCard(cardId, {
      title, toListId, keepChecklists, keepLabels, keepMembers, keepDates, keepAttachments, keepComments,
    });
    onCopied?.(newId);
    onClose();
  }

  const fieldCls = 'w-full bg-trello-cardBg border border-trello-borderSubtle focus:border-trello-accent rounded px-2 py-1.5 text-sm text-trello-text outline-none transition-colors';

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Copy card"
      className="absolute right-0 top-full mt-1 w-64 bg-trello-surfaceRaised border border-trello-borderSubtle rounded-lg shadow-2xl z-50 p-3 flex flex-col gap-2"
    >
      <p className="text-xs font-semibold text-trello-textSubtle uppercase tracking-wide">Copy card</p>

      <label className="text-xs text-trello-textSubtle">Title</label>
      <textarea
        rows={2}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className={`${fieldCls} resize-none`}
      />

      <label className="text-xs text-trello-textSubtle">List</label>
      <select className={fieldCls} value={toListId} onChange={(e) => setToListId(e.target.value)}>
        {lists.map((l) => (
          <option key={l.id} value={l.id}>{l.title}{l.id === card.listId ? ' (current)' : ''}</option>
        ))}
      </select>

      {showKeep && (
        <>
          <p className="text-xs text-trello-textSubtle mt-1">Keep…</p>
          <div className="flex flex-col gap-1">
            {hasChecklists  && <KeepRow checked={keepChecklists}  onChange={setKeepChecklists}  label={`Checklists (${card.checklists.length})`} />}
            {hasLabels      && <KeepRow checked={keepLabels}      onChange={setKeepLabels}      label={`Labels (${card.labelIds.length})`} />}
            {hasMembers     && <KeepRow checked={keepMembers}     onChange={setKeepMembers}     label={`Members (${card.memberIds.length})`} />}
            {hasDates       && <KeepRow checked={keepDates}       onChange={setKeepDates}       label="Dates" />}
            {hasAttachments && <KeepRow checked={keepAttachments} onChange={setKeepAttachments} label={`Attachments (${card.attachments.length})`} />}
            {hasComments    && <KeepRow checked={keepComments}    onChange={setKeepComments}    label="Comments" />}
          </div>
        </>
      )}

      <button onClick={submit} className="btn-primary text-xs px-3 py-1.5 mt-1">Create card</button>
    </div>
  );
}

function KeepRow({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 text-sm text-trello-textSecondary cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded-sm accent-trello-accent"
      />
      {label}
    </label>
  );
}
