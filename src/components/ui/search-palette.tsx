"use client";

import { useState, useEffect, useRef, useTransition, useCallback } from "react";
import { Search, LayoutList, X, Clock, User as UserIcon } from "lucide-react";
import { globalSearch, type SearchResults } from "@/features/search/actions";
import { useRouter } from "next/navigation";

const RECENTS_KEY = "tc:recent-searches";

type FlatItem =
  | { kind: "board"; id: string; label: string; sublabel?: string; background: string; onSelect: () => void }
  | { kind: "card"; id: string; label: string; sublabel?: string; onSelect: () => void }
  | { kind: "member"; id: string; label: string; sublabel?: string; avatarUrl: string | null; onSelect: () => void };

export function SearchPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [recents, setRecents] = useState<string[]>([]);
  const [active, setActive] = useState(0);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // Global Cmd/Ctrl+K toggle.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setOpen((v) => !v); }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      try { setRecents(JSON.parse(localStorage.getItem(RECENTS_KEY) ?? "[]")); } catch { setRecents([]); }
    } else {
      setQuery(""); setResults(null); setActive(0);
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) { setResults(null); return; }
    const id = setTimeout(() => {
      startTransition(async () => {
        try { setResults(await globalSearch(query)); setActive(0); }
        catch { setResults(null); }
      });
    }, 250);
    return () => clearTimeout(id);
  }, [query]);

  const rememberQuery = useCallback((q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setRecents((prev) => {
      const next = [trimmed, ...prev.filter((r) => r !== trimmed)].slice(0, 5);
      try { localStorage.setItem(RECENTS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  // Flatten grouped results into an ordered, keyboard-navigable list.
  const items: FlatItem[] = [];
  if (results) {
    for (const b of results.boards) {
      items.push({
        kind: "board", id: b.id, label: b.title, background: b.background,
        onSelect: () => { rememberQuery(query); router.push(`/board/${b.id}`); setOpen(false); },
      });
    }
    for (const c of results.cards) {
      items.push({
        kind: "card", id: c.id, label: c.title, sublabel: c.boardTitle,
        // Open the card's modal on its board.
        onSelect: () => { rememberQuery(query); router.push(`/board/${c.boardId}?card=${c.id}`); setOpen(false); },
      });
    }
    for (const m of results.members) {
      items.push({
        kind: "member", id: m.id, label: m.name ?? m.email ?? "User", sublabel: m.email ?? undefined, avatarUrl: m.avatarUrl,
        onSelect: () => { rememberQuery(query); setOpen(false); },
      });
    }
  }

  function onListKey(e: React.KeyboardEvent) {
    if (items.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => (i + 1) % items.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => (i - 1 + items.length) % items.length); }
    else if (e.key === "Enter") { e.preventDefault(); items[active]?.onSelect(); }
  }

  if (!open) return null;

  const boardItems = items.filter((i) => i.kind === "board");
  const cardItems = items.filter((i) => i.kind === "card");
  const memberItems = items.filter((i) => i.kind === "member");
  const indexOf = (it: FlatItem) => items.indexOf(it);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
      role="dialog" aria-modal="true" aria-label="Search"
    >
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search size={16} className="text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onListKey}
            placeholder="Search cards, boards, people…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground text-foreground"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
          )}
          <kbd className="text-xs text-muted-foreground border border-border rounded px-1">Esc</kbd>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {isPending && <div className="px-4 py-4 text-sm text-muted-foreground">Searching…</div>}

          {!isPending && query && results && items.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">No results for &quot;{query}&quot;</div>
          )}

          {!isPending && cardItems.length > 0 && (
            <Group title="Cards">
              {cardItems.map((it) => (
                <Row key={it.id} active={indexOf(it) === active} onMouseEnter={() => setActive(indexOf(it))} onClick={it.onSelect}>
                  <LayoutList size={14} className="text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-foreground truncate">{it.label}</p>
                    {it.sublabel && <p className="text-xs text-muted-foreground truncate">{it.sublabel}</p>}
                  </div>
                </Row>
              ))}
            </Group>
          )}

          {!isPending && boardItems.length > 0 && (
            <Group title="Boards">
              {boardItems.map((it) => (
                <Row key={it.id} active={indexOf(it) === active} onMouseEnter={() => setActive(indexOf(it))} onClick={it.onSelect}>
                  <div className="w-6 h-6 rounded flex-shrink-0" style={{ background: it.kind === "board" ? it.background : undefined }} />
                  <span className="text-foreground truncate">{it.label}</span>
                </Row>
              ))}
            </Group>
          )}

          {!isPending && memberItems.length > 0 && (
            <Group title="Members">
              {memberItems.map((it) => (
                <Row key={it.id} active={indexOf(it) === active} onMouseEnter={() => setActive(indexOf(it))} onClick={it.onSelect}>
                  {it.kind === "member" && it.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0"><UserIcon size={13} className="text-muted-foreground" /></div>
                  )}
                  <div className="min-w-0">
                    <p className="text-foreground truncate">{it.label}</p>
                    {it.sublabel && <p className="text-xs text-muted-foreground truncate">{it.sublabel}</p>}
                  </div>
                </Row>
              ))}
            </Group>
          )}

          {!query && recents.length > 0 && (
            <Group title="Recent searches">
              {recents.map((r) => (
                <button key={r} onClick={() => setQuery(r)} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent text-sm text-left">
                  <Clock size={14} className="text-muted-foreground flex-shrink-0" />
                  <span className="text-foreground truncate">{r}</span>
                </button>
              ))}
            </Group>
          )}

          {!query && recents.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">Type to search cards, boards, and people</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</div>
      {children}
    </section>
  );
}

function Row({ active, onClick, onMouseEnter, children }: { active: boolean; onClick: () => void; onMouseEnter: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left ${active ? "bg-accent" : "hover:bg-accent"}`}
    >
      {children}
    </button>
  );
}
