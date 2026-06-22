'use client';

import { useShallow } from 'zustand/shallow';
import { ListChecks } from 'lucide-react';
import { useBoardStore } from '@/store/use-board-store';
import type { CustomFieldDef, ID } from '@/types';

/**
 * Card-modal section for the Custom Fields power-up. Renders the board's field
 * definitions as editable inputs bound to `card.customFieldValues`. Renders
 * nothing when the power-up is off or the board has no fields.
 */
export function CardCustomFields({ cardId }: { cardId: ID }) {
  const setCardFieldValue = useBoardStore((s) => s.setCardFieldValue);

  const data = useBoardStore(
    useShallow((s) => {
      const card = s.cards[cardId];
      if (!card) return null;
      const board = s.boards[s.lists[card.listId]?.boardId ?? ''];
      if (!board?.powerUps?.customFields) return null;
      const fields = board.customFields ?? [];
      if (fields.length === 0) return null;
      return { fields, values: card.customFieldValues ?? {} };
    }),
  );

  if (!data) return null;
  const { fields, values } = data;

  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-trello-textSubtle mb-2">
        <ListChecks className="w-3.5 h-3.5" /> Custom fields
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {fields.map((f) => (
          <FieldInput
            key={f.id}
            field={f}
            value={values[f.id]}
            onChange={(v) => setCardFieldValue(cardId, f.id, v)}
          />
        ))}
      </div>
    </div>
  );
}

const inputCls = 'w-full bg-trello-cardBg border border-trello-borderSubtle focus:border-trello-accent rounded px-2 py-1.5 text-sm text-trello-text outline-none transition-colors';

function FieldInput({ field, value, onChange }: {
  field: CustomFieldDef;
  value: string | number | boolean | null | undefined;
  onChange: (v: string | number | boolean | null) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-trello-textSubtle truncate">{field.name}</span>
      {field.type === 'text' && (
        <input type="text" className={inputCls} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />
      )}
      {field.type === 'number' && (
        <input type="number" className={inputCls} value={value === null || value === undefined ? '' : String(value)} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} />
      )}
      {field.type === 'date' && (
        <input type="date" className={inputCls} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value || null)} />
      )}
      {field.type === 'dropdown' && (
        <select className={inputCls} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value || null)}>
          <option value="">—</option>
          {(field.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      )}
      {field.type === 'checkbox' && (
        <button
          type="button"
          role="switch"
          aria-checked={!!value}
          onClick={() => onChange(!value)}
          className={`self-start relative h-5 w-9 rounded-full transition-colors ${value ? 'bg-trello-accent' : 'bg-white/20'}`}
        >
          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${value ? 'left-4' : 'left-0.5'}`} />
        </button>
      )}
    </label>
  );
}
