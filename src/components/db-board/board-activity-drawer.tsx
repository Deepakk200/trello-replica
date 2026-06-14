"use client";

import { useState } from "react";
import { Activity as ActivityIcon, X } from "lucide-react";
import { getBoardActivity } from "@/features/activity/actions";

type Row = Awaited<ReturnType<typeof getBoardActivity>>[number];

function message(type: string, data: Record<string, unknown>, who: string, cardTitle: string | null): string {
  const card = cardTitle ? `"${cardTitle}"` : "a card";
  switch (type) {
    case "card.created": return `${who} created ${card}`;
    case "card.moved": return `${who} moved ${card}`;
    case "card.renamed": return `${who} renamed a card to "${String(data.title ?? "")}"`;
    case "card.archived": return `${who} archived ${card}`;
    case "label.toggled": return `${who} changed a label on ${card}`;
    case "due.set": return `${who} set a due date on ${card}`;
    case "due.cleared": return `${who} cleared the due date on ${card}`;
    case "card.completed": return data.completed ? `${who} completed ${card}` : `${who} reopened ${card}`;
    case "card.description.changed": return `${who} updated the description of ${card}`;
    case "comment.added": return `${who} commented on ${card}`;
    case "member.assigned": return `${who} assigned a member to ${card}`;
    case "member.unassigned": return `${who} unassigned a member from ${card}`;
    case "list.created": return `${who} added a list`;
    case "list.deleted": return `${who} deleted a list`;
    default: return `${who} updated the board`;
  }
}

export function BoardActivityDrawer({ boardId }: { boardId: string }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  async function openDrawer() {
    setOpen(true);
    setLoading(true);
    try {
      setRows(await getBoardActivity(boardId));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={openDrawer}
        title="Board activity"
        className="flex items-center gap-1.5 text-white/80 hover:text-white hover:bg-white/20 px-2 py-1 rounded text-sm"
      >
        <ActivityIcon size={14} /><span className="hidden sm:inline">Activity</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex justify-end" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative w-full max-w-sm h-full bg-trello-surfaceRaised border-l border-trello-border shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-trello-border">
              <h2 className="text-base font-semibold text-trello-text flex items-center gap-1.5"><ActivityIcon size={15} /> Activity</h2>
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-trello-cardHover text-trello-textSubtle hover:text-trello-text"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5">
              {loading && <p className="text-sm text-trello-textSubtle">Loading…</p>}
              {!loading && rows.length === 0 && <p className="text-sm text-trello-textSubtle italic">No activity yet.</p>}
              {rows.map((r) => (
                <div key={r.id} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-trello-textSubtle shrink-0" />
                  <p className="text-xs text-trello-textSecondary">
                    {message(r.type, (r.data ?? {}) as Record<string, unknown>, r.user?.name ?? "Someone", r.card?.title ?? null)}
                    <span className="block text-[10px] text-trello-textSubtle mt-0.5">{new Date(r.createdAt).toLocaleString()}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
