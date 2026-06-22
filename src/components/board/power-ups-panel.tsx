'use client';

import { useState } from 'react';
import { CheckSquare, ListChecks, Plus, ThumbsUp, Trash2, X } from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { useBoardStore } from '@/store/use-board-store';
import type { CustomFieldType, ID } from '@/types';

/**
 * Power-Ups panel — in-house, per-board feature toggles (NOT a 3rd-party
 * marketplace). Ships two real power-ups: **Voting** (👍 on cards) and **Custom
 * Fields** (per-board field defs surfaced on the card back + front). Opened from
 * the board header ⚡ button.
 */

const FIELD_TYPES: { value: CustomFieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
];

export function PowerUpsPanel({ boardId, onClose }: { boardId: ID; onClose: () => void }) {
  const board = useBoardStore(useShallow((s) => s.boards[boardId]));
  const toggleBoardPowerUp = useBoardStore((s) => s.toggleBoardPowerUp);
  const addCustomField = useBoardStore((s) => s.addCustomField);
  const removeCustomField = useBoardStore((s) => s.removeCustomField);

  const [name, setName] = useState('');
  const [type, setType] = useState<CustomFieldType>('text');
  const [optionsText, setOptionsText] = useState('');

  if (!board) return null;
  const votingOn = !!board.powerUps?.voting;
  const fieldsOn = !!board.powerUps?.customFields;
  const fields = board.customFields ?? [];

  function addField() {
    const n = name.trim();
    if (!n) return;
    const options = type === 'dropdown'
      ? optionsText.split(',').map((o) => o.trim()).filter(Boolean)
      : undefined;
    addCustomField(boardId, { name: n, type, options });
    setName(''); setOptionsText(''); setType('text');
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} aria-hidden="true" />
      <div className="anim-menu-enter fixed top-12 md:top-11 right-0 z-50 w-85 max-w-[calc(100vw-1rem)] h-[calc(100vh-48px)] md:h-[calc(100vh-44px)] bg-trello-surfaceRaised border-l border-trello-border flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-trello-border shrink-0">
          <h2 className="font-semibold text-sm text-trello-text">Power-Ups</h2>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded hover:bg-trello-cardHover text-trello-textSubtle hover:text-trello-text transition-colors"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {/* Voting */}
          <PowerUpRow
            icon={<ThumbsUp className="w-4 h-4" />}
            title="Voting"
            desc="Let members vote on cards. A 👍 button + count appears on every card."
            on={votingOn}
            onToggle={() => toggleBoardPowerUp(boardId, 'voting')}
          />

          {/* Custom Fields */}
          <PowerUpRow
            icon={<ListChecks className="w-4 h-4" />}
            title="Custom Fields"
            desc="Add structured fields (text, number, date, dropdown, checkbox) to every card on this board."
            on={fieldsOn}
            onToggle={() => toggleBoardPowerUp(boardId, 'customFields')}
          />

          {fieldsOn && (
            <div className="rounded-lg border border-trello-borderSubtle bg-trello-surface p-3 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-trello-textSubtle">Fields ({fields.length})</p>

              {fields.length === 0 && <p className="text-xs text-trello-textSubtle italic">No fields yet — add one below.</p>}
              <div className="flex flex-col gap-1.5">
                {fields.map((f) => (
                  <div key={f.id} className="flex items-center gap-2 bg-trello-cardBg rounded px-2.5 py-1.5">
                    <span className="text-sm text-trello-text flex-1 truncate">{f.name}</span>
                    <span className="text-[10px] uppercase tracking-wide text-trello-textSubtle bg-white/5 rounded px-1.5 py-0.5">{f.type}</span>
                    <button onClick={() => removeCustomField(boardId, f.id)} aria-label={`Remove field ${f.name}`} className="text-trello-textSubtle hover:text-trello-danger transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>

              {/* Add field */}
              <div className="space-y-2 pt-1 border-t border-white/10">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Field name"
                  className="w-full bg-trello-cardBg border border-trello-borderSubtle focus:border-trello-accent rounded px-2 py-1.5 text-sm text-trello-text outline-none"
                  onKeyDown={(e) => { if (e.key === 'Enter') addField(); }}
                />
                <div className="flex gap-2">
                  <select value={type} onChange={(e) => setType(e.target.value as CustomFieldType)} className="flex-1 bg-trello-cardBg border border-trello-borderSubtle focus:border-trello-accent rounded px-2 py-1.5 text-sm text-trello-text outline-none">
                    {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <button onClick={addField} disabled={!name.trim()} className="btn-primary text-xs px-3 py-1.5 disabled:opacity-40 inline-flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>
                {type === 'dropdown' && (
                  <input
                    value={optionsText}
                    onChange={(e) => setOptionsText(e.target.value)}
                    placeholder="Options, comma-separated"
                    className="w-full bg-trello-cardBg border border-trello-borderSubtle focus:border-trello-accent rounded px-2 py-1.5 text-sm text-trello-text outline-none"
                  />
                )}
              </div>
            </div>
          )}

          <p className="flex items-center gap-1.5 text-[11px] text-trello-textSubtle pt-1">
            <CheckSquare className="w-3 h-3" /> Power-Ups apply to this board only.
          </p>
        </div>
      </div>
    </>
  );
}

function PowerUpRow({ icon, title, desc, on, onToggle }: {
  icon: React.ReactNode; title: string; desc: string; on: boolean; onToggle: () => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-trello-borderSubtle bg-trello-surface p-3">
      <span className="mt-0.5 text-trello-textSecondary">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-trello-text">{title}</p>
        <p className="text-xs text-trello-textSubtle leading-snug">{desc}</p>
      </div>
      <button
        role="switch"
        aria-checked={on}
        aria-label={`Toggle ${title}`}
        onClick={onToggle}
        className={`mt-0.5 shrink-0 relative h-5 w-9 rounded-full transition-colors ${on ? 'bg-trello-accent' : 'bg-white/20'}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${on ? 'left-4' : 'left-0.5'}`} />
      </button>
    </div>
  );
}
