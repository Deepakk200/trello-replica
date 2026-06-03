"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { Search, LayoutList, X } from "lucide-react";
import { search } from "@/features/search/actions";
import { useRouter } from "next/navigation";

type SearchResult = Awaited<ReturnType<typeof search>>;

export function SearchPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else { setQuery(""); setResults(null); }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) { setResults(null); return; }
    const id = setTimeout(() => {
      startTransition(async () => {
        try {
          const r = await search(query);
          setResults(r);
        } catch {
          setResults(null);
        }
      });
    }, 250);
    return () => clearTimeout(id);
  }, [query]);

  if (!open) return null;

  const totalResults = (results?.boards.length ?? 0) + (results?.cards.length ?? 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
      role="dialog"
      aria-modal="true"
      aria-label="Search"
    >
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search size={16} className="text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search boards and cards…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground text-foreground"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          )}
          <kbd className="text-xs text-muted-foreground border border-border rounded px-1">Esc</kbd>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {isPending && <div className="px-4 py-4 text-sm text-muted-foreground">Searching…</div>}

          {!isPending && query && results && totalResults === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No results for &quot;{query}&quot;
            </div>
          )}

          {!isPending && results && results.boards.length > 0 && (
            <section>
              <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Boards</div>
              {results.boards.map((board) => (
                <button
                  key={board.id}
                  onClick={() => { router.push(`/board/${board.id}`); setOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent text-sm text-left"
                >
                  <div className="w-6 h-6 rounded flex-shrink-0" style={{ background: board.background }} />
                  <span className="text-foreground truncate">{board.title}</span>
                </button>
              ))}
            </section>
          )}

          {!isPending && results && results.cards.length > 0 && (
            <section>
              <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cards</div>
              {results.cards.map((card) => (
                <button
                  key={card.id}
                  onClick={() => { router.push(`/board/${card.boardId}`); setOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent text-sm text-left"
                >
                  <LayoutList size={14} className="text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-foreground truncate">{card.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{card.boardTitle}</p>
                  </div>
                </button>
              ))}
            </section>
          )}

          {!query && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Type to search across boards and cards
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
