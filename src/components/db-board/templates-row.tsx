"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LayoutTemplate, ArrowUpRight, X } from "lucide-react";
import { BOARD_TEMPLATES, type TemplateId } from "@/features/boards/template-defs";
import { createBoardFromTemplate } from "@/features/boards/templates";

// Trello-style "featured" template strip: a promo header (icon + title + subtext
// + dismiss) over a row of preview cards. Clicking a card starts a real board
// from that template (unchanged behavior).
export function TemplatesRow() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  function create(id: TemplateId) {
    setBusy(id);
    start(async () => {
      const r = await createBoardFromTemplate(id);
      if (r.ok) router.push(`/board/${r.board.id}`);
      else setBusy(null);
    });
  }

  if (dismissed) return null;

  return (
    <section className="mb-8" data-testid="template-section">
      {/* Promo header */}
      <div className="flex items-start gap-3 mb-3">
        <LayoutTemplate size={18} className="text-trello-accent mt-0.5 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-trello-text">Get going faster with a template</h2>
          <p className="text-xs text-trello-textSubtle">Start a board from a ready-made layout — then make it yours.</p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded text-trello-textSubtle hover:text-trello-text hover:bg-trello-cardHover flex-shrink-0"
          aria-label="Dismiss templates"
        >
          <X size={15} />
        </button>
      </div>

      {/* Preview cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {BOARD_TEMPLATES.map((t) => (
          <button
            key={t.id}
            data-testid="template-card"
            onClick={() => create(t.id)}
            disabled={pending}
            className="group relative h-24 text-left rounded-lg overflow-hidden flex flex-col justify-start p-3 shadow-card hover:ring-2 hover:ring-white/40 focus-visible:ring-2 focus-visible:ring-white/60 transition-shadow disabled:opacity-50"
            style={{ background: t.background }}
            title={t.description}
          >
            <p className="text-sm font-bold text-white drop-shadow line-clamp-2">{busy === t.id ? "Creating…" : t.name}</p>
            <ArrowUpRight size={16} className="absolute bottom-2 right-2 text-white/70 group-hover:text-white" />
          </button>
        ))}
      </div>
    </section>
  );
}
