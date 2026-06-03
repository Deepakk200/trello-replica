import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

// What each connected user broadcasts about themselves.
type Presence = {
  cursor: { x: number; y: number } | null;
  selectedCardId: string | null;
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
    color: string;
  };
};

// Shared mutable room state. Empty — card/list data lives in Postgres.
type Storage = Record<string, never>;

// Enriched user info returned by /api/liveblocks-auth.
type UserMeta = {
  id: string;
  info: {
    name: string;
    avatarUrl: string | null;
    color: string;
  };
};

type RoomEvent =
  | { type: "CARD_MOVED"; cardId: string; toListId: string; position: number }
  | { type: "CARD_CREATED"; listId: string }
  | { type: "CARD_DELETED"; cardId: string }
  | { type: "LIST_CREATED"; boardId: string }
  | { type: "LIST_DELETED"; listId: string }
  | { type: "COMMENT_ADDED"; cardId: string };

export const client = createClient({
  // Authenticated rooms only — the server endpoint mints scoped tokens.
  authEndpoint: "/api/liveblocks-auth",
});

export const {
  RoomProvider,
  useMyPresence,
  useOthers,
  useBroadcastEvent,
  useEventListener,
  useSelf,
} = createRoomContext<Presence, Storage, UserMeta, RoomEvent>(client);
