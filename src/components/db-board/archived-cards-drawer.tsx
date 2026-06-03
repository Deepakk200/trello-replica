"use client";

import { useState, useTransition } from "react";
import { Archive, RotateCcw, X } from "lucide-react";
import { getArchivedCards, restoreCard, deleteCard } from "@/features/cards/actions";
import { useRouter } from "next/navigation";

type ArchivedCard = Awaited<ReturnType<typeof getArchivedCards>>[number];

export function ArchivedCardsDrawer({ boardId }: { boardId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [cards, setCards] = useState<ArchivedCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleOpen() {
    setOpen(true);
    setLoading(true);
    setCards(await getArchivedCards(boardId));
    setLoading(false);
  }
  function handleRestore(cardId: string) {
    startTransition(async () => {
      await restoreCard(cardId);
      setCards((prev) => prev.filter((c) => c.id !== cardId));
      router.refresh();
    });
  }
  function handleDelete(cardId: string) {
    startTransition(async () => {
      await deleteCard(cardId);
      setCards((prev) => prev.filter((c) => c.id !== cardId));
      router.refresh();
    });
  }

  return (
    <>
      <button onClick={handleOpen} className="flex items-center gap-1 text-white/70 hover:text-white hover:bg-white/20 px-2 py-1 rounded text-sm">
        <Archive size={14} /><span className="hidden sm:inline">Archived</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-80 z-50 bg-card border-l border-border flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2"><Archive size={14} /> Archived Cards</h2>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
              {loading && <p className="text-sm text-muted-foreground text-center py-8">Loading…</p>}
              {!loading && cards.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No archived cards</p>}
              {!loading && cards.map((card) => (
                <div key={card.id} className="bg-muted/40 rounded-lg p-3 text-sm">
                  <p className="font-medium text-foreground">{card.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">From: {card.list.title}</p>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => handleRestore(card.id)} disabled={isPending} className="flex items-center gap-1 text-xs bg-primary/20 hover:bg-primary/30 text-primary px-2 py-1 rounded">
                      <RotateCcw size={10} /> Restore
                    </button>
                    <button onClick={() => handleDelete(card.id)} disabled={isPending} className="text-xs text-destructive hover:underline px-2 py-1">Delete permanently</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
