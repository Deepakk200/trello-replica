// Butler-style automation types (MODE LOCAL). Shapes mirror the planned Prisma
// Automation table (trigger/conditions/actions as JSON) so the DB upgrade is
// mechanical — only the storage + execution location changes.
import type { ID } from "@/types";

export type TriggerType =
  | "card.moved"        // moved into a list
  | "card.created"      // created in a list
  | "card.completed"    // marked complete
  | "due.set"           // a due date was set
  | "label.added"
  | "label.removed"
  | "checklist.completed";

export interface Trigger {
  type: TriggerType;
  /** For card.moved / card.created: only fire for this target list. */
  listId?: ID;
  /** For label.added / label.removed: only fire for this label. */
  labelId?: ID;
}

export type ConditionType =
  | "has-label"
  | "no-label"
  | "has-due"
  | "in-list"
  | "title-contains";

export interface Condition {
  type: ConditionType;
  labelId?: ID;
  listId?: ID;
  text?: string;
}

export type ActionType =
  | "move"            // move card to listId at top/bottom
  | "archive"
  | "add-label"
  | "remove-label"
  | "set-due"         // relative: in `days` days
  | "remove-due"
  | "complete"
  | "comment"
  | "add-checklist-item";

export interface AutomationAction {
  type: ActionType;
  listId?: ID;
  position?: "top" | "bottom";
  labelId?: ID;
  days?: number;
  text?: string;
}

export type AutomationKind = "rule" | "card-button" | "board-button";

export interface Automation {
  id: ID;
  boardId: ID;
  name: string;
  enabled: boolean;
  kind: AutomationKind;
  trigger: Trigger; // ignored for buttons (manual)
  conditions: Condition[];
  actions: AutomationAction[];
  createdAt: string;
}

/** Emitted by store mutations and consumed by the engine. */
export interface BoardEvent {
  type: TriggerType;
  boardId: ID;
  cardId: ID;
  listId?: ID;
  labelId?: ID;
}
