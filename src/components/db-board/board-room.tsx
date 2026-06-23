"use client";

// Wraps a single board in a Liveblocks room. Room ID = board ID.
import { RoomProvider } from "@/lib/liveblocks.config";
import type { ReactNode } from "react";

// Only attempt a realtime connection when Liveblocks is configured. Without a
// key the auth endpoint returns 501 and the client would retry forever, spamming
// the console — autoConnect={false} mounts the room (so child presence/event
// hooks still work) but never connects. Realtime is simply off; the board works.
const REALTIME = Boolean(process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY);

export function BoardRoom({ boardId, children }: { boardId: string; children: ReactNode }) {
  return (
    <RoomProvider
      id={boardId}
      autoConnect={REALTIME}
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
