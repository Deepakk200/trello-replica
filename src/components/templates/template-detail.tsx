"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Eye } from "lucide-react";
import { useShallow } from "zustand/shallow";
import { useBoardStore, useHasHydrated } from "@/store/use-board-store";
import { getTemplate, userTemplateToGallery } from "@/features/templates/queries";
import { formatViews, type GalleryTemplate } from "@/data/templates";
import { useTemplateViews } from "@/store/use-template-views";
import { UseTemplateModal } from "./use-template-modal";

export function TemplateDetail({ slug }: { slug: string }) {
  const hydrated = useHasHydrated();
  const boardTemplates = useBoardStore(useShallow((s) => s.boardTemplates));
  const increment = useTemplateViews((s) => s.increment);
  const extra = useTemplateViews((s) => s.views[slug] ?? 0);
  const [open, setOpen] = useState(false);

  // Resolve from the official dataset first, then the user's saved templates.
  const template: GalleryTemplate | undefined = useMemo(() => {
    const official = getTemplate(slug);
    if (official) return official;
    const bt = boardTemplates[slug];
    return bt ? userTemplateToGallery(bt) : undefined;
  }, [slug, boardTemplates]);

  // Increment the view count once on open (persisted).
  useEffect(() => {
    if (template) increment(template.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template?.id]);

  if (!hydrated) {
    return <div className="mx-auto max-w-3xl px-6 py-10 text-sm text-trello-textSubtle">Loading…</div>;
  }
  if (!template) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="text-trello-text font-semibold mb-2">Template not found</p>
        <Link href="/templates" className="text-trello-accent text-sm hover:underline">← Back to templates</Link>
      </div>
    );
  }

  const totalCards = template.lists.reduce((n, l) => n + l.cards.length, 0);
  const views = template.viewCount + extra;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6">
      <Link href="/templates" className="inline-flex items-center gap-1.5 text-sm text-trello-textSubtle hover:text-trello-text mb-4">
        <ArrowLeft size={15} /> Back to templates
      </Link>

      <div className="h-40 rounded-xl mb-5" style={{ background: template.previewColor }} />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <h1 className="text-2xl font-bold text-trello-text">{template.title}</h1>
          <div className="flex items-center gap-3 mt-1.5 text-sm text-trello-textSubtle">
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-linear-to-br from-sky-500 to-indigo-500 text-white text-[9px] font-bold flex items-center justify-center">
                {template.author[0]?.toUpperCase()}
              </span>
              by {template.author}
            </span>
            <span className="flex items-center gap-1"><Eye size={13} /> {formatViews(views)} views</span>
            <span className="text-[10px] uppercase tracking-wide bg-trello-cardHover px-1.5 py-0.5 rounded">{template.category}</span>
          </div>
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary px-5 py-2.5 text-sm font-medium">
          Use this template
        </button>
      </div>

      <p className="text-sm text-trello-textSecondary mb-6 max-w-2xl">{template.description}</p>

      <h2 className="text-sm font-semibold text-trello-text mb-1">What&apos;s included</h2>
      <p className="text-xs text-trello-textSubtle mb-3">{template.lists.length} lists · {totalCards} cards</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {template.lists.map((list, i) => (
          <div key={i} className="rounded-lg border border-trello-border bg-trello-surfaceRaised p-3">
            <p className="text-sm font-semibold text-trello-text mb-2">{list.title}</p>
            {list.cards.length === 0 ? (
              <p className="text-xs text-trello-textSubtle italic">No cards</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {list.cards.map((c, j) => (
                  <li key={j} className="text-xs text-trello-textSecondary bg-trello-cardBg rounded px-2 py-1.5">{c.title}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      {open && <UseTemplateModal template={template} onClose={() => setOpen(false)} />}
    </div>
  );
}
