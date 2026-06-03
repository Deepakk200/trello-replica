"use client";

// Wraps a single board in a Liveblocks room. Room ID = board ID.
import { RoomProvider } from "@/lib/liveblocks.config";
import type { ReactNode } from "react";

export function BoardRoom({ boardId, children }: { boardId: string; children: ReactNode }) {
  return (
    <RoomProvider
      id={boardId}
      initialPresence={{
        cursor: null,
        selectedCardId: null,
        user: { id: "", name: "", avatarUrl: null, color: "#0079BF" },
      }}
    >
      {children}
    </RoomProvider>
  );
}
