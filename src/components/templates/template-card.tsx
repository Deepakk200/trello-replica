"use client";

import Link from "next/link";
import { Eye } from "lucide-react";
import { formatViews, type GalleryTemplate } from "@/data/templates";
import { useTemplateViews } from "@/store/use-template-views";

export function TemplateCard({ template }: { template: GalleryTemplate }) {
  const extra = useTemplateViews((s) => s.views[template.id] ?? 0);
  const views = template.viewCount + extra;

  return (
    <Link
      href={`/templates/${template.slug}`}
      className="group flex flex-col rounded-xl overflow-hidden border border-trello-border bg-trello-surfaceRaised hover:border-trello-accent hover:shadow-xl transition-all cursor-pointer"
    >
      {/* Preview */}
      <div className="relative h-28" style={{ background: template.previewColor }}>
        <span className="absolute top-2 left-2 text-[10px] font-semibold uppercase tracking-wide text-white/90 bg-black/30 px-1.5 py-0.5 rounded">
          {template.category}
        </span>
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
      </div>

      {/* Body */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        <h3 className="text-sm font-semibold text-trello-text line-clamp-2">{template.title}</h3>
        <div className="mt-auto flex items-center justify-between">
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="w-4 h-4 rounded-full bg-linear-to-br from-sky-500 to-indigo-500 text-white text-[8px] font-bold flex items-center justify-center shrink-0">
              {template.author[0]?.toUpperCase()}
            </span>
            <span className="text-[11px] text-trello-textSubtle truncate">by {template.author}</span>
          </span>
          <span className="flex items-center gap-1 text-[11px] text-trello-textSubtle shrink-0">
            <Eye size={12} /> {formatViews(views)}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function TemplateCardSkeleton() {
  return (
    <div className="flex flex-col rounded-xl overflow-hidden border border-trello-border bg-trello-surfaceRaised animate-pulse">
      <div className="h-28 bg-trello-cardHover" />
      <div className="p-3 flex flex-col gap-2">
        <div className="h-3.5 w-3/4 rounded bg-trello-cardHover" />
        <div className="h-3 w-1/2 rounded bg-trello-cardHover" />
      </div>
    </div>
  );
}
