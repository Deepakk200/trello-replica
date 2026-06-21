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

/**
 * Bulk multi-select operations with undo. Each captures the exact prior state of
 * the affected cards and registers the precise inverse, then clears the selection.
 */

export function bulkMoveWithUndo(cardIds: ID[], toListId: ID) {
  const s = boardStore.getState();
  // Capture each card's origin (list + index) so undo re-inserts it precisely.
  const origins = cardIds
    .map((id) => {
      const card = s.cards[id];
      if (!card) return null;
      const fromList = s.lists[card.listId];
      if (!fromList || fromList.id === toListId) return null;
      return { id, fromListId: card.listId, fromIndex: fromList.cardIds.indexOf(id) };
    })
    .filter((o): o is { id: ID; fromListId: ID; fromIndex: number } => !!o)
    .sort((a, b) => a.fromIndex - b.fromIndex);
  s.bulkMoveCards(cardIds, toListId);
  s.clearCardSelection();
  if (origins.length === 0) return;
  useUndoStore.getState().push(`${plural(origins.length)} moved`, () => {
    const st = boardStore.getState();
    // Restore lowest origin index first so later inserts land correctly.
    origins.forEach((o) => st.moveCard(o.id, o.fromListId, o.fromIndex));
  });
}

export function bulkAddLabelWithUndo(cardIds: ID[], labelId: ID) {
  const s = boardStore.getState();
  // Only the cards that DIDN'T already have the label change → undo removes from exactly those.
  const changed = cardIds.filter((id) => s.cards[id] && !s.cards[id].labelIds.includes(labelId));
  s.bulkAddLabelToCards(cardIds, labelId);
  if (changed.length === 0) return;
  useUndoStore.getState().push(`Label added to ${plural(changed.length)}`, () => {
    const st = boardStore.getState();
    changed.forEach((id) => st.toggleCardLabel(id, labelId));
  });
}

export function bulkRemoveLabelWithUndo(cardIds: ID[], labelId: ID) {
  const s = boardStore.getState();
  const changed = cardIds.filter((id) => s.cards[id] && s.cards[id].labelIds.includes(labelId));
  s.bulkRemoveLabelFromCards(cardIds, labelId);
  if (changed.length === 0) return;
  useUndoStore.getState().push(`Label removed from ${plural(changed.length)}`, () => {
    const st = boardStore.getState();
    st.bulkAddLabelToCards(changed, labelId);
  });
}

export function bulkSetDueWithUndo(cardIds: ID[], dueDate: string | null) {
  const s = boardStore.getState();
  const prev = cardIds
    .filter((id) => s.cards[id])
    .map((id) => ({ id, dueDate: s.cards[id].dueDate }));
  if (prev.length === 0) return;
  s.bulkSetDueForCards(cardIds, dueDate);
  useUndoStore.getState().push(
    dueDate ? `Due date set on ${plural(prev.length)}` : `Due date cleared on ${plural(prev.length)}`,
    () => {
      const st = boardStore.getState();
      prev.forEach((p) => st.updateCard(p.id, { dueDate: p.dueDate }));
    },
  );
}

export function bulkAddMemberWithUndo(cardIds: ID[], memberId: ID) {
  const s = boardStore.getState();
  const changed = cardIds.filter((id) => s.cards[id] && !s.cards[id].memberIds.includes(memberId));
  s.bulkAddMemberToCards(cardIds, memberId);
  if (changed.length === 0) return;
  useUndoStore.getState().push(`Member added to ${plural(changed.length)}`, () => {
    const st = boardStore.getState();
    changed.forEach((id) => st.toggleCardMember(id, memberId));
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
