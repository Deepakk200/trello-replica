'use client';

import { useEffect, useRef } from 'react';
import { CalendarDays, Clock, X } from 'lucide-react';

export type InboxFilterState = {
  keyword: string;
  created: string[]; // 'lastWeek' | 'lastTwoWeeks' | 'lastMonth'
  status: string[];  // 'complete' | 'incomplete'
  due: string[];     // 'none' | 'overdue' | 'nextDay' | 'nextWeek' | 'nextMonth'
};

export const EMPTY_INBOX_FILTER: InboxFilterState = { keyword: '', created: [], status: [], due: [] };

export function isInboxFilterActive(f: InboxFilterState): boolean {
  return f.keyword.trim() !== '' || f.created.length > 0 || f.status.length > 0 || f.due.length > 0;
}

type InboxCardLike = { title: string; createdAt: string; completed?: boolean; dueDate?: string | null };

/** Trello semantics: AND across sections, OR within a section. */
export function inboxCardMatches(card: InboxCardLike, f: InboxFilterState): boolean {
  const kw = f.keyword.trim().toLowerCase();
  if (kw && !card.title.toLowerCase().includes(kw)) return false;

  const now = Date.now();
  const DAY = 86400000;

  if (f.created.length) {
    const created = new Date(card.createdAt).getTime();
    const within = (d: number) => !Number.isNaN(created) && now - created <= d * DAY;
    const ok = f.created.some((c) =>
      c === 'lastWeek' ? within(7) : c === 'lastTwoWeeks' ? within(14) : c === 'lastMonth' ? within(30) : false);
    if (!ok) return false;
  }

  if (f.status.length) {
    const ok = f.status.some((s) =>
      s === 'complete' ? card.completed === true : s === 'incomplete' ? card.completed !== true : false);
    if (!ok) return false;
  }

  if (f.due.length) {
    const due = card.dueDate ? new Date(card.dueDate).getTime() : null;
    const within = (d: number) => due !== null && due >= now && due <= now + d * DAY;
    const ok = f.due.some((d) =>
      d === 'none' ? !card.dueDate :
      d === 'overdue' ? (due !== null && due < now && card.completed !== true) :
      d === 'nextDay' ? within(1) :
      d === 'nextWeek' ? within(7) :
      d === 'nextMonth' ? within(30) : false);
    if (!ok) return false;
  }

  return true;
}

const CREATED = [
  ['lastWeek', 'Created in the last week'],
  ['lastTwoWeeks', 'Created in the last two weeks'],
  ['lastMonth', 'Created in the last month'],
] as const;

const DUE: { value: string; label: string; icon: React.ReactNode }[] = [
  { value: 'none',      label: 'No dates',              icon: <CalendarDays size={15} className="text-white/50" /> },
  { value: 'overdue',   label: 'Overdue',               icon: <Clock size={15} className="text-[#F87168]" /> },
  { value: 'nextDay',   label: 'Due in the next day',   icon: <Clock size={15} className="text-[#F5CD47]" /> },
  { value: 'nextWeek',  label: 'Due in the next week',  icon: <Clock size={15} className="text-white/50" /> },
  { value: 'nextMonth', label: 'Due in the next month', icon: <Clock size={15} className="text-white/50" /> },
];

export function InboxFilter({ filter, onChange, onClose }: {
  filter: InboxFilterState;
  onChange: (f: InboxFilterState) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  function toggle(section: 'created' | 'status' | 'due', value: string) {
    const arr = filter[section];
    onChange({ ...filter, [section]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value] });
  }

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Filter inbox"
      className="anim-popover-enter origin-top-right absolute right-0 top-full mt-1.5 z-50 w-[310px] max-h-[min(70vh,560px)] overflow-y-auto bg-[#282E33] rounded-lg shadow-2xl border border-white/10 p-4 text-white"
    >
      {/* Header */}
      <div className="relative flex items-center justify-center h-6 mb-1">
        <span className="text-sm font-semibold">Filter</span>
        <button
          onClick={onClose}
          aria-label="Close filter"
          className="absolute right-0 p-1 rounded hover:bg-white/10 text-white/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#579DFF]"
        >
          <X size={16} />
        </button>
      </div>

      {/* Keyword */}
      <p className="text-xs font-semibold text-white/50 mt-3 mb-1.5">Keyword</p>
      <input
        value={filter.keyword}
        onChange={(e) => onChange({ ...filter, keyword: e.target.value })}
        placeholder="Enter a keyword"
        className="w-full bg-white/[0.06] border border-white/15 focus:border-[#579DFF] rounded px-2.5 py-1.5 text-sm outline-none placeholder:text-white/40"
      />
      <p className="text-[11px] text-white/40 mt-1">Search card names.</p>

      {/* Card created */}
      <p className="text-xs font-semibold text-white/50 mt-4 mb-2">Card created</p>
      {CREATED.map(([value, label]) => (
        <FilterRow key={value} checked={filter.created.includes(value)} onToggle={() => toggle('created', value)} label={label} />
      ))}

      {/* Card status */}
      <p className="text-xs font-semibold text-white/50 mt-4 mb-2">Card status</p>
      <FilterRow checked={filter.status.includes('complete')} onToggle={() => toggle('status', 'complete')} label="Marked as complete" />
      <FilterRow checked={filter.status.includes('incomplete')} onToggle={() => toggle('status', 'incomplete')} label="Not marked as complete" />

      {/* Due date */}
      <p className="text-xs font-semibold text-white/50 mt-4 mb-2">Due date</p>
      {DUE.map(({ value, label, icon }) => (
        <FilterRow key={value} checked={filter.due.includes(value)} onToggle={() => toggle('due', value)} label={label} icon={icon} />
      ))}
    </div>
  );
}

function FilterRow({ checked, onToggle, label, icon }: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <label className="flex items-center gap-2 px-1 py-1.5 rounded hover:bg-white/5 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="h-4 w-4 rounded-sm border border-white/25 bg-transparent accent-[#579DFF] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#579DFF]"
      />
      {icon}
      <span className="text-sm text-white/90">{label}</span>
    </label>
  );
}
