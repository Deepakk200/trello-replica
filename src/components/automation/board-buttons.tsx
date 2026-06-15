"use client";

import { Zap } from "lucide-react";
import { useShallow } from "zustand/shallow";
import { boardStore } from "@/store/use-board-store";
import { useAutomations } from "@/store/use-automations";
import { runManualAutomation } from "@/lib/automation/engine";
import type { Automation } from "@/lib/automation/types";

// Board buttons run their actions across every non-archived card on the board
// (the board-level mapping of the card-centric action set).
function runBoardButton(a: Automation, boardId: string) {
  const st = boardStore.getState();
  const cardIds = Object.values(st.lists)
    .filter((l) => l.boardId === boardId && !l.isArchived)
    .flatMap((l) => l.cardIds);
  for (const cid of cardIds) runManualAutomation(a, cid);
}

export function BoardButtons({ boardId }: { boardId: string }) {
  const buttons = useAutomations(
    useShallow((s) => s.automations.filter((a) => a.boardId === boardId && a.kind === "board-button")),
  );
  if (buttons.length === 0) return null;
  return (
    <>
      {buttons.map((b) => (
        <button
          key={b.id}
          onClick={() => runBoardButton(b, boardId)}
          title="Run board button (applies to all cards)"
          className="h-7 px-2 rounded text-white/80 hover:text-white hover:bg-white/20 flex items-center gap-1 text-xs transition-colors"
        >
          <Zap size={12} /> {b.name}
        </button>
      ))}
    </>
  );
}
