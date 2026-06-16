"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { SmilePlus } from "lucide-react";
import { toggleReaction } from "@/features/cards/actions";

const PRESET = ["👍", "🎉", "❤️", "🚀", "👀", "✅"];

// Emoji reactions on a comment (prompt 06). Groups reactions by emoji with a
// count + "mine" highlight, plus a small preset picker. Optimistic-free: toggles
// via the server action then asks the parent to refetch.
export function CommentReactions({
  commentId,
  reactions,
  onChanged,
}: {
  commentId: string;
  reactions: { emoji: string; userId: string }[];
  onChanged: () => void;
}) {
  const { data: session } = useSession();
  const me = session?.user?.id;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const groups = new Map<string, { count: number; mine: boolean }>();
  for (const r of reactions) {
    const g = groups.get(r.emoji) ?? { count: 0, mine: false };
    g.count += 1;
    if (r.userId === me) g.mine = true;
    groups.set(r.emoji, g);
  }

  async function react(emoji: string) {
    if (busy) return;
    setBusy(true);
    setOpen(false);
    try {
      await toggleReaction(commentId, emoji);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-1 mt-1 flex-wrap">
      {[...groups.entries()].map(([emoji, g]) => (
        <button
          key={emoji}
          onClick={() => react(emoji)}
          disabled={busy}
          className={`text-xs px-1.5 py-0.5 rounded-full border leading-none ${
            g.mine ? "border-trello-accent bg-trello-accent/15 text-trello-text" : "border-trello-border bg-trello-cardHover text-trello-textSecondary"
          }`}
        >
          {emoji} {g.count}
        </button>
      ))}
      <div className="relative">
        <button onClick={() => setOpen((v) => !v)} className="text-trello-textSubtle hover:text-trello-text p-0.5" aria-label="Add reaction">
          <SmilePlus size={14} />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute left-0 top-full mt-1 z-20 flex gap-1 bg-trello-surfaceRaised border border-trello-border rounded-lg p-1 shadow-xl">
              {PRESET.map((e) => (
                <button key={e} onClick={() => react(e)} className="text-base hover:scale-110 transition-transform px-0.5">{e}</button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
