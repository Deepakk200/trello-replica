"use client";

import { useState } from "react";
import { Sparkles, Loader2, Check, X } from "lucide-react";
import { useBoardStore } from "@/store/use-board-store";
import type { ID } from "@/types";
import { aiBreakIntoChecklist, aiImproveDescription, aiSummarizeText } from "@/features/ai/assist";

type Pending =
  | { kind: "description"; text: string }
  | { kind: "summary"; text: string }
  | { kind: "checklist"; items: string[] };

function AiBtn({ label, busy, disabled, onClick }: { label: string; busy: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-trello-cardHover hover:brightness-110 text-trello-text disabled:opacity-50"
    >
      {busy ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} className="text-trello-accent" />}
      {label}
    </button>
  );
}

// AI never mutates without review — results land in a `pending` preview the user
// accepts or discards.
export function CardAiAssist({ cardId }: { cardId: ID }) {
  const card = useBoardStore((s) => s.cards[cardId]);
  const updateCard = useBoardStore((s) => s.updateCard);
  const createChecklist = useBoardStore((s) => s.createChecklist);
  const addChecklistItem = useBoardStore((s) => s.addChecklistItem);

  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);

  if (!card) return null;

  async function run(kind: Pending["kind"]) {
    setError(""); setPending(null); setLoading(kind);
    const input = { title: card!.title, description: card!.description ?? "" };
    try {
      if (kind === "description") {
        const r = await aiImproveDescription(input);
        if (r.ok) setPending({ kind, text: r.description }); else setError(r.error);
      } else if (kind === "summary") {
        const r = await aiSummarizeText(input);
        if (r.ok) setPending({ kind, text: r.summary }); else setError(r.error);
      } else {
        const r = await aiBreakIntoChecklist(input);
        if (r.ok) setPending({ kind, items: r.items }); else setError(r.error);
      }
    } catch {
      setError("AI request failed");
    } finally {
      setLoading(null);
    }
  }

  function accept() {
    if (!pending) return;
    if (pending.kind === "description") updateCard(cardId, { description: pending.text });
    else if (pending.kind === "checklist") {
      const clId = createChecklist(cardId, "AI Checklist");
      for (const item of pending.items) addChecklistItem(cardId, clId, item);
    }
    // summary is display-only
    setPending(null);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-trello-textSubtle mr-1">AI</span>
        <AiBtn label="Break into checklist" busy={loading === "checklist"} disabled={!!loading} onClick={() => run("checklist")} />
        <AiBtn label="Improve description" busy={loading === "description"} disabled={!!loading} onClick={() => run("description")} />
        <AiBtn label="Summarize" busy={loading === "summary"} disabled={!!loading} onClick={() => run("summary")} />
      </div>

      {error && <p className="text-xs text-trello-danger">{error}</p>}

      {pending && (
        <div className="bg-trello-cardBg border border-trello-borderSubtle rounded-lg p-3 flex flex-col gap-2">
          <p className="text-[11px] uppercase tracking-wide text-trello-textSubtle">Review — nothing is applied until you accept</p>
          {pending.kind === "checklist" ? (
            <ul className="list-disc pl-5 text-sm text-trello-text">
              {pending.items.map((it, i) => <li key={i}>{it}</li>)}
            </ul>
          ) : (
            <p className="text-sm text-trello-textSecondary whitespace-pre-wrap">{pending.text}</p>
          )}
          <div className="flex gap-2">
            {pending.kind !== "summary" && (
              <button onClick={accept} className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1"><Check size={12} /> Accept</button>
            )}
            <button onClick={() => setPending(null)} className="btn-ghost text-xs px-3 py-1.5 flex items-center gap-1"><X size={12} /> {pending.kind === "summary" ? "Close" : "Discard"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
