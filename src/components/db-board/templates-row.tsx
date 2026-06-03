"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BOARD_TEMPLATES, type TemplateId } from "@/features/boards/template-defs";
import { createBoardFromTemplate } from "@/features/boards/templates";

export function TemplatesRow() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

  function create(id: TemplateId) {
    setBusy(id);
    start(async () => {
      const r = await createBoardFromTemplate(id);
      if (r.ok) router.push(`/board/${r.board.id}`);
      else setBusy(null);
    });
  }

  return (
    <section className="mb-6">
      <h2 className="text-sm font-semibold text-trello-text mb-2">Start from a template</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {BOARD_TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => create(t.id)}
            disabled={pending}
            className="text-left rounded-lg overflow-hidden border border-trello-border hover:border-trello-accent transition-colors disabled:opacity-50"
          >
            <div className="h-10" style={{ background: t.background }} />
            <div className="p-2">
              <p className="text-sm font-medium text-trello-text">{busy === t.id ? "Creating…" : t.name}</p>
              <p className="text-[11px] text-trello-textSubtle line-clamp-2">{t.description}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
