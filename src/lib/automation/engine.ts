// Automation execution engine (MODE LOCAL). Pure-ish evaluator that runs enabled
// automations via the REAL board-store actions, with a depth-based loop guard and
// a "Butler:" activity log line. Same interface shape as a future MODE-DB server
// engine (runBoardEvent after a mutation).
"use client";

import { boardStore } from "@/store/use-board-store";
import { useAutomations } from "@/store/use-automations";
import { setBoardEventHandler } from "./bus";
import type {
  Automation, AutomationAction, BoardEvent, Condition, Trigger,
} from "./types";
import type { Card } from "@/types";

const MAX_DEPTH = 5; // loop guard: an action that re-triggers a rule can't recurse forever
let depth = 0;

// ── Human-readable summaries (for the builder UI) ────────────────────────────

function listName(id?: string): string {
  return (id && boardStore.getState().lists[id]?.title) || "a list";
}
function labelName(id?: string): string {
  return (id && boardStore.getState().labels[id]?.name) || "a label";
}

export function triggerText(t: Trigger): string {
  switch (t.type) {
    case "card.moved": return `a card is moved into ${listName(t.listId)}`;
    case "card.created": return `a card is created in ${listName(t.listId)}`;
    case "card.completed": return "a card is marked complete";
    case "due.set": return "a due date is set on a card";
    case "label.added": return `the ${labelName(t.labelId)} label is added`;
    case "label.removed": return `the ${labelName(t.labelId)} label is removed`;
    case "checklist.completed": return "a checklist is completed";
  }
}
function conditionText(c: Condition): string {
  switch (c.type) {
    case "has-label": return `has the ${labelName(c.labelId)} label`;
    case "no-label": return `does not have the ${labelName(c.labelId)} label`;
    case "has-due": return "has a due date";
    case "in-list": return `is in ${listName(c.listId)}`;
    case "title-contains": return `title contains "${c.text ?? ""}"`;
  }
}
function actionText(a: AutomationAction): string {
  switch (a.type) {
    case "move": return `move it to the ${a.position ?? "top"} of ${listName(a.listId)}`;
    case "archive": return "archive it";
    case "add-label": return `add the ${labelName(a.labelId)} label`;
    case "remove-label": return `remove the ${labelName(a.labelId)} label`;
    case "set-due": return `set the due date in ${a.days ?? 1} day(s)`;
    case "remove-due": return "remove the due date";
    case "complete": return "mark it complete";
    case "comment": return `comment "${a.text ?? ""}"`;
    case "add-checklist-item": return `add checklist item "${a.text ?? ""}"`;
  }
}

export function summarize(a: Automation): string {
  const actions = a.actions.map(actionText).join(", then ");
  if (a.kind !== "rule") return `When clicked, ${actions || "do nothing"}.`;
  const conds = a.conditions.length ? `, and the card ${a.conditions.map(conditionText).join(" and ")},` : "";
  return `When ${triggerText(a.trigger)}${conds} then ${actions || "do nothing"}.`;
}

// ── Evaluation ───────────────────────────────────────────────────────────────

function conditionsPass(conds: Condition[], card: Card): boolean {
  return conds.every((c) => {
    switch (c.type) {
      case "has-label": return !!c.labelId && card.labelIds.includes(c.labelId);
      case "no-label": return !!c.labelId && !card.labelIds.includes(c.labelId);
      case "has-due": return !!card.dueDate;
      case "in-list": return card.listId === c.listId;
      case "title-contains": return !!c.text && card.title.toLowerCase().includes(c.text.toLowerCase());
      default: return true;
    }
  });
}

/** Run an action list against a card. Returns plain-English summaries of what ran. */
function runActions(actions: AutomationAction[], cardId: string): string[] {
  const ran: string[] = [];
  const st = () => boardStore.getState();

  for (const a of actions) {
    const card = st().cards[cardId];
    if (!card) break;
    switch (a.type) {
      case "move": {
        if (!a.listId) break;
        const target = st().lists[a.listId];
        const index = a.position === "bottom" ? (target?.cardIds.length ?? 0) : 0;
        st().moveCard(cardId, a.listId, index);
        ran.push(`moved to ${target?.title ?? "list"}`);
        break;
      }
      case "archive":
        st().archiveCard(cardId);
        ran.push("archived");
        break;
      case "add-label":
        if (a.labelId && !card.labelIds.includes(a.labelId)) st().toggleCardLabel(cardId, a.labelId);
        ran.push(`added ${labelName(a.labelId)}`);
        break;
      case "remove-label":
        if (a.labelId && card.labelIds.includes(a.labelId)) st().toggleCardLabel(cardId, a.labelId);
        ran.push(`removed ${labelName(a.labelId)}`);
        break;
      case "set-due": {
        const due = new Date(Date.now() + (a.days ?? 1) * 86_400_000).toISOString();
        st().updateCard(cardId, { dueDate: due });
        ran.push(`due in ${a.days ?? 1}d`);
        break;
      }
      case "remove-due":
        st().updateCard(cardId, { dueDate: null });
        ran.push("cleared due date");
        break;
      case "complete":
        st().updateCard(cardId, { completed: true });
        ran.push("marked complete");
        break;
      case "comment":
        st().pushActivity(cardId, { type: "commented", text: a.text ?? "", author: "Butler", authorInitials: "BT" });
        ran.push("commented");
        break;
      case "add-checklist-item": {
        const existing = card.checklists[0];
        const checklistId = existing ? existing.id : st().createChecklist(cardId, "Checklist");
        st().addChecklistItem(cardId, checklistId, a.text ?? "Item");
        ran.push("added checklist item");
        break;
      }
    }
  }
  return ran;
}

function triggerMatches(t: Trigger, e: BoardEvent): boolean {
  if (t.type !== e.type) return false;
  if ((t.type === "card.moved" || t.type === "card.created") && t.listId) return t.listId === e.listId;
  if ((t.type === "label.added" || t.type === "label.removed") && t.labelId) return t.labelId === e.labelId;
  return true;
}

/** Handler for events emitted by store mutations. */
export function runBoardEvent(e: BoardEvent): void {
  if (depth >= MAX_DEPTH) return;
  const rules = useAutomations.getState().automations.filter(
    (a) => a.kind === "rule" && a.enabled && a.boardId === e.boardId && triggerMatches(a.trigger, e),
  );
  if (rules.length === 0) return;

  for (const rule of rules) {
    const card = boardStore.getState().cards[e.cardId];
    if (!card) continue;
    if (!conditionsPass(rule.conditions, card)) continue;
    depth++;
    try {
      const ran = runActions(rule.actions, e.cardId);
      if (ran.length) {
        boardStore.getState().pushActivity(e.cardId, {
          type: "commented",
          text: `Butler (${rule.name}): ${ran.join(", ")}`,
          author: "Butler",
          authorInitials: "BT",
        });
      }
    } finally {
      depth--;
    }
  }
}

/** Manually run a card/board button on a specific card. */
export function runManualAutomation(automation: Automation, cardId: string): void {
  if (depth >= MAX_DEPTH) return;
  depth++;
  try {
    const ran = runActions(automation.actions, cardId);
    if (ran.length) {
      boardStore.getState().pushActivity(cardId, {
        type: "commented",
        text: `Butler (${automation.name}): ${ran.join(", ")}`,
        author: "Butler",
        authorInitials: "BT",
      });
    }
  } finally {
    depth--;
  }
}

let registered = false;
/** Register the engine as the board-event handler (idempotent, client-only). */
export function registerAutomationEngine(): void {
  if (registered) return;
  registered = true;
  setBoardEventHandler(runBoardEvent);
}
