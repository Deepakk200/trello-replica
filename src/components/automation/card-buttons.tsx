"use client";

import { Zap } from "lucide-react";
import { useShallow } from "zustand/shallow";
import { useAutomations } from "@/store/use-automations";
import { runManualAutomation } from "@/lib/automation/engine";
import type { ID } from "@/types";

// Card buttons (Butler) render on the card modal and run their actions on THIS card.
export function CardButtons({ cardId, boardId }: { cardId: ID; boardId: ID }) {
  const buttons = useAutomations(
    useShallow((s) => s.automations.filter((a) => a.boardId === boardId && a.kind === "card-button")),
  );
  if (buttons.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-trello-textSubtle mb-2">Buttons</p>
      <div className="flex flex-col gap-1">
        {buttons.map((b) => (
          <button
            key={b.id}
            onClick={() => runManualAutomation(b, cardId)}
            className="btn-soft flex items-center gap-2 text-sm h-11 md:h-8 px-3 w-full justify-start"
          >
            <Zap className="w-4 h-4 text-trello-accent" /> {b.name}
          </button>
        ))}
      </div>
    </div>
  );
}
