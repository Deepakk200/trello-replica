"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Sparkles, Loader2, X } from "lucide-react";
import { boardStore } from "@/store/use-board-store";
import { aiSummarizeBoard } from "@/features/ai/assist";

function isOverdue(due: string | null): boolean {
  return !!due && new Date(due).getTime() < Date.now();
}

export function BoardSummaryButton({ boardId, className }: { boardId: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");

  async function run() {
    setOpen(true); setLoading(true); setError(""); setSummary("");
    const st = boardStore.getState();
    const board = st.boards[boardId];
    if (!board) { setError("Board not found"); setLoading(false); return; }
    const lists = board.listIds
      .map((lid) => st.lists[lid])
      .filter((l): l is NonNullable<typeof l> => !!l && !l.isArchived)
      .map((l) => ({
        title: l.title,
        cards: l.cardIds
          .map((cid) => st.cards[cid])
          .filter((c): c is NonNullable<typeof c> => !!c && !c.isArchived)
          .map((c) => ({ title: c.title, completed: c.completed, overdue: isOverdue(c.dueDate) })),
      }));
    try {
      const r = await aiSummarizeBoard({ boardTitle: board.title, lists });
      if (r.ok) setSummary(r.summary);
      else setError(r.error);
    } catch {
      setError("AI request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button onClick={run} title="Summarize board with AI" className={className}>
        <Sparkles size={14} />
      </button>
      {open && createPortal(
        <div className="fixed inset-0 z-[80] bg-black/60 flex items-start justify-center py-20 px-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md bg-trello-surfaceRaised border border-trello-border rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-trello-border">
              <h2 className="text-base font-semibold text-trello-text flex items-center gap-2"><Sparkles size={16} className="text-trello-accent" /> Board summary</h2>
              <button onClick={() => setOpen(false)} aria-label="Close" className="p-1 rounded hover:bg-trello-cardHover text-trello-textSubtle hover:text-trello-text"><X size={18} /></button>
            </div>
            <div className="p-4 text-sm text-trello-textSecondary min-h-24">
              {loading && <span className="flex items-center gap-2 text-trello-textSubtle"><Loader2 size={14} className="animate-spin" /> Summarizing…</span>}
              {error && <span className="text-trello-danger">{error}</span>}
              {summary && <p className="whitespace-pre-wrap leading-relaxed">{summary}</p>}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
