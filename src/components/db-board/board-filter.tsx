"use client";

// Client-side board filter (Trello "Filter" popover). Filters the already-loaded
// board by keyword / label / member / due. OR within a section, AND across
// sections — matches Trello. Non-matching cards are hidden by the caller.

import { useState } from "react";
import { ListFilter } from "lucide-react";

export type DueFilter = "overdue" | "hasDue" | "none";

export type BoardFilter = {
  keyword: string;
  labelIds: Set<string>;
  memberIds: Set<string>;
  due: Set<DueFilter>;
};

export const EMPTY_FILTER: BoardFilter = {
  keyword: "",
  labelIds: new Set(),
  memberIds: new Set(),
  due: new Set(),
};

export function filterCount(f: BoardFilter): number {
  return (f.keyword.trim() ? 1 : 0) + f.labelIds.size + f.memberIds.size + f.due.size;
}

// Minimal structural shape — avoids importing the heavy BoardData type.
type FilterCard = {
  title: string;
  completed: boolean;
  dueDate: Date | string | null;
  labels: { labelId: string }[];
  assignees: { userId: string }[];
};

export function cardMatches(card: FilterCard, f: BoardFilter): boolean {
  const kw = f.keyword.trim().toLowerCase();
  if (kw && !card.title.toLowerCase().includes(kw)) return false;

  if (f.labelIds.size && !card.labels.some((l) => f.labelIds.has(l.labelId))) return false;

  if (f.memberIds.size && !card.assignees.some((a) => f.memberIds.has(a.userId))) return false;

  if (f.due.size) {
    const now = new Date().getTime();
    const due = card.dueDate ? new Date(card.dueDate).getTime() : null;
    const hit = [...f.due].some((d) =>
      d === "overdue" ? due !== null && due < now && !card.completed :
      d === "hasDue" ? due !== null :
      /* none */ due === null,
    );
    if (!hit) return false;
  }
  return true;
}

const DUE_LABELS: { id: DueFilter; label: string }[] = [
  { id: "overdue", label: "Overdue" },
  { id: "hasDue", label: "Has a due date" },
  { id: "none", label: "No due date" },
];

function toggle<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export function BoardFilterButton({
  labels, members, filter, onChange,
}: {
  labels: { id: string; name: string | null; color: string }[];
  members: { userId: string; user: { name: string | null; avatarUrl: string | null } }[];
  filter: BoardFilter;
  onChange: (f: BoardFilter) => void;
}) {
  const [open, setOpen] = useState(false);
  const n = filterCount(filter);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title="Filter cards"
        aria-haspopup="true"
        aria-expanded={open}
        className={`flex items-center gap-1.5 px-2 py-1 rounded text-sm ${n ? "bg-white/25 text-white" : "text-white/80 hover:text-white hover:bg-white/20"}`}
      >
        <ListFilter size={14} /><span className="hidden sm:inline">Filter</span>
        {n > 0 && <span className="text-[10px] font-bold bg-white text-black rounded-full px-1.5 leading-tight">{n}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 w-72 max-h-[70vh] overflow-y-auto bg-trello-surfaceRaised border border-trello-border rounded-lg shadow-xl p-3 anim-popover-enter text-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-trello-text">Filter</p>
              {n > 0 && (
                <button onClick={() => onChange(EMPTY_FILTER)} className="text-xs text-trello-accent hover:underline">Clear all</button>
              )}
            </div>

            <input
              value={filter.keyword}
              onChange={(e) => onChange({ ...filter, keyword: e.target.value })}
              placeholder="Search card titles…"
              aria-label="Filter by keyword"
              className="w-full mb-3 bg-trello-cardBg border border-trello-borderSubtle rounded px-2 py-1.5 text-trello-text outline-none focus:ring-1 focus:ring-trello-accent placeholder:text-trello-textSubtle"
            />

            {labels.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-trello-textSubtle mb-1.5">Labels</p>
                <div className="flex flex-col gap-1">
                  {labels.map((l) => (
                    <label key={l.id} className="flex items-center gap-2 cursor-pointer hover:bg-trello-cardHover rounded px-1 py-0.5">
                      <input type="checkbox" checked={filter.labelIds.has(l.id)} onChange={() => onChange({ ...filter, labelIds: toggle(filter.labelIds, l.id) })} className="accent-trello-accent" />
                      <span className="h-4 flex-1 rounded" style={{ background: l.color }} />
                      <span className="text-trello-text truncate flex-1">{l.name || ""}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {members.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-trello-textSubtle mb-1.5">Members</p>
                <div className="flex flex-col gap-1">
                  {members.map((m) => (
                    <label key={m.userId} className="flex items-center gap-2 cursor-pointer hover:bg-trello-cardHover rounded px-1 py-0.5">
                      <input type="checkbox" checked={filter.memberIds.has(m.userId)} onChange={() => onChange({ ...filter, memberIds: toggle(filter.memberIds, m.userId) })} className="accent-trello-accent" />
                      <span className="text-trello-text truncate">{m.user.name || "Unknown"}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-trello-textSubtle mb-1.5">Due date</p>
              <div className="flex flex-col gap-1">
                {DUE_LABELS.map((d) => (
                  <label key={d.id} className="flex items-center gap-2 cursor-pointer hover:bg-trello-cardHover rounded px-1 py-0.5">
                    <input type="checkbox" checked={filter.due.has(d.id)} onChange={() => onChange({ ...filter, due: toggle(filter.due, d.id) })} className="accent-trello-accent" />
                    <span className="text-trello-text">{d.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
