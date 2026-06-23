'use client';

// Canonical (DB-backed) create-board tile — the dark "+ Create new board" card
// that opens Trello's Create board popover (CreateBoardDialog).

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { CreateBoardDialog } from './create-board-dialog';

// Swatch set shared with the board header's background picker (db-board-view).
export const BOARD_BACKGROUNDS = [
  'linear-gradient(135deg,#0079bf,#5067c5)',
  'linear-gradient(135deg,#d29034,#f5a623)',
  'linear-gradient(135deg,#519839,#4bce97)',
  'linear-gradient(135deg,#b04632,#e2483d)',
  '#026aa7',
  '#89609e',
];

export function CreateBoardTile() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="h-24 rounded-lg bg-trello-cardHover hover:bg-trello-surfaceRaised flex items-center justify-center gap-1.5 text-sm text-trello-textSubtle hover:text-trello-text transition-colors focus-visible:outline-2 focus-visible:outline-trello-accent"
      >
        <Plus size={16} /> Create new board
      </button>
      {open && <CreateBoardDialog onClose={() => setOpen(false)} />}
    </>
  );
}
