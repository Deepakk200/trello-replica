"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, LayoutTemplate } from "lucide-react";
import { useShallow } from "zustand/shallow";
import { useBoardStore, useHasHydrated } from "@/store/use-board-store";
import {
  SIDEBAR_CATEGORIES, FEATURED, YOUR_TEMPLATES, type SidebarCategory,
  listTemplates, categoryCounts, userTemplateToGallery,
} from "@/features/templates/queries";
import type { GalleryTemplate } from "@/data/templates";
import { TemplateCard, TemplateCardSkeleton } from "./template-card";
import { CreateBoardWithAI } from "@/components/ai/create-board-with-ai";

export function TemplatesGalleryPage() {
  const hydrated = useHasHydrated();
  const [cat, setCat] = useState<SidebarCategory>(FEATURED);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");

  // Debounce the search input.
  useEffect(() => {
    const id = setTimeout(() => setQuery(search), 200);
    return () => clearTimeout(id);
  }, [search]);

  const boardTemplates = useBoardStore(useShallow((s) => s.boardTemplates));
  const userTemplates = useMemo(
    () => Object.values(boardTemplates).map(userTemplateToGallery),
    [boardTemplates],
  );

  const counts = useMemo(() => {
    const c = categoryCounts();
    c[YOUR_TEMPLATES] = userTemplates.length;
    return c;
  }, [userTemplates.length]);

  const results: GalleryTemplate[] = useMemo(() => {
    if (cat === YOUR_TEMPLATES) {
      const q = query.trim().toLowerCase();
      return userTemplates.filter(
        (t) => !q || t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q),
      );
    }
    return listTemplates(cat, query);
  }, [cat, query, userTemplates]);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
      <div className="flex items-center gap-2 mb-1">
        <LayoutTemplate size={20} className="text-trello-accent" />
        <h1 className="text-xl font-bold text-trello-text">Templates</h1>
        <div className="ml-auto"><CreateBoardWithAI /></div>
      </div>
      <p className="text-sm text-trello-textSubtle mb-5">
        Get a head start with a ready-made board. Choose a template, then make it your own.
      </p>

      {/* Mobile category dropdown */}
      <div className="md:hidden mb-4">
        <label className="sr-only" htmlFor="cat-select">Category</label>
        <select
          id="cat-select"
          value={cat}
          onChange={(e) => setCat(e.target.value as SidebarCategory)}
          className="w-full bg-trello-cardBg border border-trello-borderSubtle rounded px-3 py-2 text-sm text-trello-text"
        >
          {SIDEBAR_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c} ({counts[c] ?? 0})</option>
          ))}
        </select>
      </div>

      <div className="flex gap-6">
        {/* Category sidebar (desktop) */}
        <aside className="hidden md:block w-52 shrink-0">
          <nav className="flex flex-col gap-0.5 sticky top-4">
            {SIDEBAR_CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`w-full text-left flex items-center justify-between px-2.5 py-1.5 rounded text-sm transition-colors ${
                  cat === c
                    ? "bg-trello-accent/20 text-trello-accent font-medium"
                    : "text-trello-text hover:bg-trello-cardHover"
                }`}
              >
                <span className="truncate">{c}</span>
                <span className="text-xs text-trello-textSubtle">{counts[c] ?? 0}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Search */}
          <div className="relative mb-5">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-trello-textSubtle" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates"
              className="w-full bg-trello-cardBg border border-trello-borderSubtle focus:border-trello-accent rounded-lg pl-9 pr-3 py-2 text-sm text-trello-text outline-none"
            />
          </div>

          {!hydrated ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => <TemplateCardSkeleton key={i} />)}
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-16 text-sm text-trello-textSubtle">
              {cat === YOUR_TEMPLATES
                ? "You haven't saved any templates yet. Open a board's ··· menu → Save as template."
                : `No templates match${query ? ` "${query}"` : ""} in ${cat}.`}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {results.map((t) => <TemplateCard key={t.id} template={t} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
