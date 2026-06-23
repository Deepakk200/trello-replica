'use client';

// Canonical (DB-backed) create-board tile — ports the polished inline create
// affordance from the legacy WorkspaceHome onto the real `createBoard` server
// action. Slice 1 of the DB-canonical unification (Phase 2).

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { createBoard } from '@/features/boards/actions';

// Same swatch set as the legacy WorkspaceHome, for visual continuity.
const SWATCHES = [
  'linear-gradient(135deg,#0079bf,#5067c5)',
  'linear-gradient(135deg,#d29034,#f5a623)',
  'linear-gradient(135deg,#519839,#4bce97)',
  'linear-gradient(135deg,#b04632,#e2483d)',
  '#026aa7',
  '#89609e',
];

export function CreateBoardTile() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [bg, setBg] = useState(SWATCHES[0]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setOpen(false);
    setTitle('');
    setBg(SWATCHES[0]);
    setError(null);
  }

  function submit() {
    const t = title.trim();
    if (!t || pending) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await createBoard({ title: t, background: bg });
        if (res.ok && res.board) {
          reset();
          router.push(`/board/${res.board.id}`);
        } else {
          setError('Could not create board.');
        }
      } catch (e) {
        // createBoard throws on plan-limit / authz; surface the message.
        setError(e instanceof Error ? e.message : 'Could not create board.');
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="h-24 rounded-lg bg-trello-cardHover hover:bg-trello-surfaceRaised flex items-center justify-center gap-1.5 text-sm text-trello-textSubtle hover:text-trello-text transition-colors focus-visible:outline-2 focus-visible:outline-trello-accent"
      >
        <Plus size={16} /> Create new board
      </button>
    );
  }

  return (
    <div className="rounded-lg bg-trello-surfaceRaised p-3 flex flex-col gap-2">
      <input
        autoFocus
        placeholder="Board title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
          if (e.key === 'Escape') reset();
        }}
        aria-label="Board title"
        className="w-full bg-trello-cardHover rounded px-2 py-1.5 text-sm text-trello-text outline-none focus:ring-1 focus:ring-trello-accent placeholder:text-trello-textSubtle"
      />
      <div className="flex gap-1.5" role="radiogroup" aria-label="Board background">
        {SWATCHES.map((sw) => (
          <button
            key={sw}
            type="button"
            onClick={() => setBg(sw)}
            role="radio"
            aria-checked={bg === sw}
            aria-label={`Background ${sw}`}
            className={`h-6 flex-1 rounded transition-transform focus-visible:outline-2 focus-visible:outline-trello-accent ${
              bg === sw ? 'ring-2 ring-white' : 'hover:scale-105'
            }`}
            style={{ background: sw }}
          />
        ))}
      </div>
      {error && <p className="text-xs text-trello-danger" role="alert">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={pending || !title.trim()}
          className="flex-1 py-1.5 rounded text-sm font-medium text-trello-textOnBold bg-trello-primary hover:bg-trello-primaryHover disabled:opacity-50 disabled:pointer-events-none transition-colors"
        >
          {pending ? 'Creating…' : 'Create'}
        </button>
        <button
          onClick={reset}
          className="px-3 py-1.5 rounded text-sm text-trello-textSubtle hover:text-trello-text hover:bg-trello-cardHover transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
