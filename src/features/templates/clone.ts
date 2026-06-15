// Clone engine (MODE LOCAL). Builds a brand-new, fully-editable board the user
// owns by calling the real board-store actions in order. Every id is freshly
// generated, so the cloned board is INDEPENDENT — editing it never mutates the
// template. (MODE DB upgrade: replace this with a transactional server action of
// the same `createBoardFromGalleryTemplate(template, opts)` shape.)
"use client";

import { nanoid } from "nanoid";
import { boardStore } from "@/store/use-board-store";
import type { GalleryTemplate } from "@/data/templates";
import type { LabelColor } from "@/types";

export interface CreateFromTemplateOpts {
  name: string;
  workspaceId?: string;
  background?: string;
}

export function createBoardFromGalleryTemplate(
  template: GalleryTemplate,
  opts: CreateFromTemplateOpts,
): string {
  const s = () => boardStore.getState();

  // Land the new board in the chosen workspace (createBoard reads activeWorkspaceId).
  if (opts.workspaceId) s().setActiveWorkspace(opts.workspaceId);

  const background = opts.background ?? template.previewColor;
  const boardId = s().createBoard(opts.name.trim() || template.title, background);

  // Labels are a global pool — dedupe by name within this clone.
  const labelIdByName = new Map<string, string>();
  const ensureLabel = (name: string, color: LabelColor): string => {
    const key = name.toLowerCase();
    const found = labelIdByName.get(key);
    if (found) return found;
    const id = nanoid(8);
    s().upsertLabel({ id, name, color });
    labelIdByName.set(key, id);
    return id;
  };

  for (const list of template.lists) {
    const listId = s().createList(boardId, list.title);
    for (const card of list.cards) {
      const cardId = s().createCard(listId, card.title);
      if (card.description) s().updateCard(cardId, { description: card.description });
      for (const lab of card.labels ?? []) {
        s().toggleCardLabel(cardId, ensureLabel(lab.name, lab.color));
      }
      if (card.checklist?.length) {
        const checklistId = s().createChecklist(cardId, "Checklist");
        for (const item of card.checklist) s().addChecklistItem(cardId, checklistId, item);
      }
    }
  }

  s().setActiveBoard(boardId);
  return boardId;
}
