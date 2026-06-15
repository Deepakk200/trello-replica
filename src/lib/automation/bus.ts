// Decoupled event bus between the board store (emitter) and the automation
// engine (handler). The store imports only `emitBoardEvent` (no dep on the
// engine/automations store), so there's no import cycle. The engine registers
// its handler once on the client.
import type { BoardEvent } from "./types";

type Handler = (e: BoardEvent) => void;

let handler: Handler | null = null;

export function setBoardEventHandler(h: Handler | null): void {
  handler = h;
}

export function emitBoardEvent(e: BoardEvent): void {
  if (!handler) return;
  try {
    handler(e);
  } catch {
    // An automation failure must never break the underlying mutation.
  }
}
