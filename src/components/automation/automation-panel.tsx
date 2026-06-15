"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X, Plus, Trash2, Zap, Bot } from "lucide-react";
import { useShallow } from "zustand/shallow";
import { useBoardStore } from "@/store/use-board-store";
import { useAutomations } from "@/store/use-automations";
import { summarize } from "@/lib/automation/engine";
import type {
  Automation, AutomationAction, AutomationKind, Condition, Trigger,
  TriggerType, ConditionType, ActionType,
} from "@/lib/automation/types";

const TRIGGERS: { v: TriggerType; label: string; needs?: "list" | "label" }[] = [
  { v: "card.moved", label: "a card is moved into…", needs: "list" },
  { v: "card.created", label: "a card is created in…", needs: "list" },
  { v: "card.completed", label: "a card is marked complete" },
  { v: "due.set", label: "a due date is set" },
  { v: "label.added", label: "a label is added…", needs: "label" },
  { v: "label.removed", label: "a label is removed…", needs: "label" },
  { v: "checklist.completed", label: "a checklist is completed" },
];
const CONDITIONS: { v: ConditionType; label: string; needs?: "list" | "label" | "text" }[] = [
  { v: "has-label", label: "has label", needs: "label" },
  { v: "no-label", label: "does not have label", needs: "label" },
  { v: "has-due", label: "has a due date" },
  { v: "in-list", label: "is in list", needs: "list" },
  { v: "title-contains", label: "title contains", needs: "text" },
];
const ACTIONS: { v: ActionType; label: string; needs?: ("list" | "label" | "days" | "text" | "position")[] }[] = [
  { v: "move", label: "move card to", needs: ["list", "position"] },
  { v: "complete", label: "mark complete" },
  { v: "add-label", label: "add label", needs: ["label"] },
  { v: "remove-label", label: "remove label", needs: ["label"] },
  { v: "set-due", label: "set due date in N days", needs: ["days"] },
  { v: "remove-due", label: "remove due date" },
  { v: "archive", label: "archive card" },
  { v: "comment", label: "comment", needs: ["text"] },
  { v: "add-checklist-item", label: "add checklist item", needs: ["text"] },
];

const fieldCls = "bg-trello-cardBg border border-trello-borderSubtle rounded px-2 py-1 text-xs text-trello-text outline-none";

export function AutomationPanel({ boardId, onClose }: { boardId: string; onClose: () => void }) {
  const { lists, labels } = useBoardStore(useShallow((s) => ({ lists: s.lists, labels: s.labels })));
  const boardLists = useMemo(() => Object.values(lists).filter((l) => l.boardId === boardId && !l.isArchived), [lists, boardId]);
  const boardLabels = useMemo(() => Object.values(labels), [labels]);

  const automations = useAutomations(useShallow((s) => s.automations.filter((a) => a.boardId === boardId)));
  const add = useAutomations((s) => s.add);
  const remove = useAutomations((s) => s.remove);
  const toggle = useAutomations((s) => s.toggle);

  const [tab, setTab] = useState<AutomationKind>("rule");
  const list = automations.filter((a) => a.kind === tab);

  const modal = (
    <div className="fixed inset-0 z-[80] bg-black/60 flex items-start justify-center py-12 px-4" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col bg-trello-surfaceRaised border border-trello-border rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-trello-border shrink-0">
          <h2 className="text-base font-semibold text-trello-text flex items-center gap-2"><Bot size={18} className="text-trello-accent" /> Automation</h2>
          <button onClick={onClose} aria-label="Close" className="p-1 rounded hover:bg-trello-cardHover text-trello-textSubtle hover:text-trello-text"><X size={18} /></button>
        </div>

        <div className="flex gap-1 px-5 pt-3 border-b border-trello-border shrink-0">
          {([["rule", "Rules"], ["card-button", "Card Buttons"], ["board-button", "Board Buttons"]] as const).map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-3 py-2 text-sm font-medium -mb-px border-b-2 ${tab === k ? "border-trello-accent text-trello-text" : "border-transparent text-trello-textSubtle hover:text-trello-text"}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          {/* Existing automations */}
          {list.length === 0 ? (
            <p className="text-sm text-trello-textSubtle">No {tab === "rule" ? "rules" : "buttons"} yet. Create one below{tab === "rule" ? ", or pick a starter." : "."}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {list.map((a) => (
                <div key={a.id} className="flex items-start gap-3 bg-trello-cardBg rounded-lg p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-trello-text">{a.name}</p>
                    <p className="text-xs text-trello-textSubtle mt-0.5">{summarize(a)}</p>
                  </div>
                  {a.kind === "rule" && (
                    <button onClick={() => toggle(a.id)} title={a.enabled ? "Disable" : "Enable"}
                      className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded ${a.enabled ? "bg-emerald-500/20 text-emerald-400" : "bg-trello-cardHover text-trello-textSubtle"}`}>
                      {a.enabled ? "On" : "Off"}
                    </button>
                  )}
                  <button onClick={() => remove(a.id)} aria-label="Delete" className="text-trello-textSubtle hover:text-trello-danger"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          )}

          {/* Starter templates (rules only) */}
          {tab === "rule" && <Starters boardId={boardId} lists={boardLists} labels={boardLabels} add={add} />}

          {/* Builder */}
          <Builder
            kind={tab}
            boardId={boardId}
            lists={boardLists}
            labels={boardLabels}
            onAdd={(a) => add(a)}
          />
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

type ListT = { id: string; title: string };
type LabelT = { id: string; name: string; color: string };

function Starters({ boardId, lists, labels, add }: {
  boardId: string; lists: ListT[]; labels: LabelT[];
  add: (a: Omit<Automation, "id" | "createdAt">) => string;
}) {
  const done = lists.find((l) => /done|complete|shipped/i.test(l.title)) ?? lists[lists.length - 1];
  const shipped = labels.find((l) => /ship/i.test(l.name));
  if (!done) return null;
  return (
    <div className="border-t border-trello-border pt-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-trello-textSubtle mb-2">Starter rules</p>
      <button
        onClick={() => add({
          boardId, kind: "rule", enabled: true,
          name: `When moved to ${done.title} → complete + label`,
          trigger: { type: "card.moved", listId: done.id },
          conditions: [],
          actions: [
            { type: "complete" },
            ...(shipped ? [{ type: "add-label" as const, labelId: shipped.id }] : []),
          ],
        })}
        className="btn-soft text-xs px-3 py-1.5"
      >
        + When moved to “{done.title}”, mark complete{shipped ? " + add ‘shipped’ label" : ""}
      </button>
    </div>
  );
}

function Builder({ kind, boardId, lists, labels, onAdd }: {
  kind: AutomationKind; boardId: string; lists: ListT[]; labels: LabelT[];
  onAdd: (a: Omit<Automation, "id" | "createdAt">) => void;
}) {
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState<Trigger>({ type: "card.moved" });
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [actions, setActions] = useState<AutomationAction[]>([{ type: "complete" }]);
  const triggerDef = TRIGGERS.find((t) => t.v === trigger.type)!;

  function save() {
    if (actions.length === 0) return;
    onAdd({
      boardId, kind, enabled: true,
      name: name.trim() || (kind === "rule" ? "Untitled rule" : "Untitled button"),
      trigger, conditions: kind === "rule" ? conditions : [], actions,
    });
    setName(""); setConditions([]); setActions([{ type: "complete" }]);
    setTrigger({ type: "card.moved" });
  }

  return (
    <div className="border-t border-trello-border pt-4 flex flex-col gap-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-trello-textSubtle flex items-center gap-1.5"><Zap size={13} /> New {kind === "rule" ? "rule" : "button"}</p>

      <input className={`${fieldCls} w-full`} placeholder={kind === "rule" ? "Rule name" : "Button label (e.g. Postpone 3 days)"} value={name} onChange={(e) => setName(e.target.value)} />

      {kind === "rule" && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-trello-textSubtle">
          <span>When</span>
          <select className={fieldCls} value={trigger.type} onChange={(e) => setTrigger({ type: e.target.value as TriggerType })}>
            {TRIGGERS.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
          </select>
          {triggerDef.needs === "list" && (
            <select className={fieldCls} value={trigger.listId ?? ""} onChange={(e) => setTrigger({ ...trigger, listId: e.target.value || undefined })}>
              <option value="">any list</option>
              {lists.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
            </select>
          )}
          {triggerDef.needs === "label" && (
            <select className={fieldCls} value={trigger.labelId ?? ""} onChange={(e) => setTrigger({ ...trigger, labelId: e.target.value || undefined })}>
              <option value="">any label</option>
              {labels.map((l) => <option key={l.id} value={l.id}>{l.name || l.color}</option>)}
            </select>
          )}
        </div>
      )}

      {kind === "rule" && (
        <ConditionEditor conditions={conditions} setConditions={setConditions} lists={lists} labels={labels} />
      )}

      <ActionEditor actions={actions} setActions={setActions} lists={lists} labels={labels} />

      <button onClick={save} className="btn-primary text-xs px-3 py-1.5 self-start">Add {kind === "rule" ? "rule" : "button"}</button>
    </div>
  );
}

function ConditionEditor({ conditions, setConditions, lists, labels }: {
  conditions: Condition[]; setConditions: (c: Condition[]) => void; lists: ListT[]; labels: LabelT[];
}) {
  return (
    <div className="flex flex-col gap-2">
      {conditions.map((c, i) => {
        const def = CONDITIONS.find((d) => d.v === c.type)!;
        const upd = (patch: Partial<Condition>) => setConditions(conditions.map((x, j) => (j === i ? { ...x, ...patch } : x)));
        return (
          <div key={i} className="flex flex-wrap items-center gap-2 text-xs text-trello-textSubtle">
            <span>and the card</span>
            <select className={fieldCls} value={c.type} onChange={(e) => upd({ type: e.target.value as ConditionType })}>
              {CONDITIONS.map((d) => <option key={d.v} value={d.v}>{d.label}</option>)}
            </select>
            {def.needs === "label" && (
              <select className={fieldCls} value={c.labelId ?? ""} onChange={(e) => upd({ labelId: e.target.value })}>
                <option value="">select…</option>{labels.map((l) => <option key={l.id} value={l.id}>{l.name || l.color}</option>)}
              </select>
            )}
            {def.needs === "list" && (
              <select className={fieldCls} value={c.listId ?? ""} onChange={(e) => upd({ listId: e.target.value })}>
                <option value="">select…</option>{lists.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
              </select>
            )}
            {def.needs === "text" && <input className={fieldCls} placeholder="text" value={c.text ?? ""} onChange={(e) => upd({ text: e.target.value })} />}
            <button onClick={() => setConditions(conditions.filter((_, j) => j !== i))} className="text-trello-textSubtle hover:text-trello-danger"><X size={12} /></button>
          </div>
        );
      })}
      <button onClick={() => setConditions([...conditions, { type: "has-label" }])} className="text-xs text-trello-accent hover:underline self-start flex items-center gap-1"><Plus size={11} /> Add condition</button>
    </div>
  );
}

function ActionEditor({ actions, setActions, lists, labels }: {
  actions: AutomationAction[]; setActions: (a: AutomationAction[]) => void; lists: ListT[]; labels: LabelT[];
}) {
  return (
    <div className="flex flex-col gap-2">
      {actions.map((a, i) => {
        const def = ACTIONS.find((d) => d.v === a.type)!;
        const needs = def.needs ?? [];
        const upd = (patch: Partial<AutomationAction>) => setActions(actions.map((x, j) => (j === i ? { ...x, ...patch } : x)));
        return (
          <div key={i} className="flex flex-wrap items-center gap-2 text-xs text-trello-textSubtle">
            <span>then</span>
            <select className={fieldCls} value={a.type} onChange={(e) => upd({ type: e.target.value as ActionType })}>
              {ACTIONS.map((d) => <option key={d.v} value={d.v}>{d.label}</option>)}
            </select>
            {needs.includes("list") && (
              <select className={fieldCls} value={a.listId ?? ""} onChange={(e) => upd({ listId: e.target.value })}>
                <option value="">select…</option>{lists.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
              </select>
            )}
            {needs.includes("position") && (
              <select className={fieldCls} value={a.position ?? "top"} onChange={(e) => upd({ position: e.target.value as "top" | "bottom" })}>
                <option value="top">top</option><option value="bottom">bottom</option>
              </select>
            )}
            {needs.includes("label") && (
              <select className={fieldCls} value={a.labelId ?? ""} onChange={(e) => upd({ labelId: e.target.value })}>
                <option value="">select…</option>{labels.map((l) => <option key={l.id} value={l.id}>{l.name || l.color}</option>)}
              </select>
            )}
            {needs.includes("days") && <input type="number" min={1} className={`${fieldCls} w-16`} value={a.days ?? 3} onChange={(e) => upd({ days: Number(e.target.value) })} />}
            {needs.includes("text") && <input className={`${fieldCls} flex-1 min-w-[120px]`} placeholder="text" value={a.text ?? ""} onChange={(e) => upd({ text: e.target.value })} />}
            {actions.length > 1 && <button onClick={() => setActions(actions.filter((_, j) => j !== i))} className="text-trello-textSubtle hover:text-trello-danger"><X size={12} /></button>}
          </div>
        );
      })}
      <button onClick={() => setActions([...actions, { type: "complete" }])} className="text-xs text-trello-accent hover:underline self-start flex items-center gap-1"><Plus size={11} /> Add action</button>
    </div>
  );
}
