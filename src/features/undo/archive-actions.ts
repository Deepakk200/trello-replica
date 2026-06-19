'use client';

import type { ID } from '@/types';
import { boardStore } from '@/store/use-board-store';
import { useUndoStore } from '@/store/use-undo-store';

/**
 * MODE LOCAL archive helpers: each performs the soft-delete via the real store
 * action and registers its exact inverse (restore / reopen) with the undo stack,
 * so the toast + Ctrl/Cmd+Z reverse precisely what happened. (MODE DB would call
 * the equivalent unarchive/restore server actions here.)
 */

function plural(n: number) {
  return `${n} card${n === 1 ? '' : 's'}`;
}

export function archiveCardWithUndo(cardId: ID) {
  const s = boardStore.getState();
  const card = s.cards[cardId];
  if (!card || card.isArchived) return;
  const title = card.title;
  s.archiveCard(cardId);
  useUndoStore.getState().push(`Card “${title}” archived`, () => boardStore.getState().restoreCard(cardId));
}

export function archiveListWithUndo(listId: ID) {
  const s = boardStore.getState();
  const list = s.lists[listId];
  if (!list || list.isArchived) return;
  const title = list.title;
  s.archiveList(listId);
  useUndoStore.getState().push(`List “${title}” archived`, () => boardStore.getState().restoreList(listId));
}

export function archiveAllCardsWithUndo(listId: ID) {
  const s = boardStore.getState();
  const list = s.lists[listId];
  if (!list) return;
  // Capture exactly the cards this action will archive, so undo restores only those.
  const affected = list.cardIds.filter((id) => s.cards[id] && !s.cards[id].isArchived);
  if (affected.length === 0) return;
  s.archiveAllCardsInList(listId);
  useUndoStore.getState().push(`${plural(affected.length)} archived`, () => {
    const st = boardStore.getState();
    affected.forEach((id) => st.restoreCard(id));
  });
}

export function bulkArchiveWithUndo(cardIds: ID[]) {
  const s = boardStore.getState();
  const affected = cardIds.filter((id) => s.cards[id] && !s.cards[id].isArchived);
  s.bulkArchiveCards(cardIds);
  s.clearCardSelection();
  if (affected.length === 0) return;
  useUndoStore.getState().push(`${plural(affected.length)} archived`, () => {
    const st = boardStore.getState();
    affected.forEach((id) => st.restoreCard(id));
  });
}

export function closeBoardWithUndo(boardId: ID) {
  const s = boardStore.getState();
  const board = s.boards[boardId];
  if (!board || board.isArchived) return;
  const title = board.title;
  s.closeBoard(boardId);
  useUndoStore.getState().push(`Board “${title}” closed`, () => boardStore.getState().reopenBoard(boardId));
}
