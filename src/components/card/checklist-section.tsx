'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { CheckSquare, Trash2 } from 'lucide-react';
import { useBoardStore } from '@/store/use-board-store';
import type { Checklist, ID } from '@/types';

export function ChecklistSection({ cardId, checklist }: { cardId: ID; checklist: Checklist }) {
  const renameChecklist    = useBoardStore((s) => s.renameChecklist);
  const deleteChecklist    = useBoardStore((s) => s.deleteChecklist);
  const addChecklistItem   = useBoardStore((s) => s.addChecklistItem);
  const toggleChecklistItem  = useBoardStore((s) => s.toggleChecklistItem);
  const renameChecklistItem  = useBoardStore((s) => s.renameChecklistItem);
  const deleteChecklistItem  = useBoardStore((s) => s.deleteChecklistItem);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(checklist.title);
  const [addingItem, setAddingItem] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const [editingItemId, setEditingItemId] = useState<ID | null>(null);
  const [editingItemText, setEditingItemText] = useState('');
  const addRef = useRef<HTMLTextAreaElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const total = checklist.items.length;
  const done  = checklist.items.filter((i) => i.completed).length;
  const pct   = total === 0 ? 0 : Math.round((done / total) * 100);

  function commitTitle() {
    const t = titleDraft.trim();
    if (t && t !== checklist.title) renameChecklist(cardId, checklist.id, t);
    else setTitleDraft(checklist.title);
    setEditingTitle(false);
  }

  function submitNewItem() {
    const t = newItemText.trim();
    if (t) addChecklistItem(cardId, checklist.id, t);
    setNewItemText('');
  }

  function commitItemRename(itemId: ID) {
    const t = editingItemText.trim();
    if (t) renameChecklistItem(cardId, checklist.id, itemId, t);
    setEditingItemId(null);
  }

  useLayoutEffect(() => {
    if (!progressRef.current) return;
    progressRef.current.style.width = `${pct}%`;
  }, [pct]);

  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-start gap-3">
        <CheckSquare className="w-5 h-5 mt-0.5 text-slate-400 shrink-0" />
        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <input
              autoFocus
              title="Checklist title"
              className="w-full bg-trello-cardBg border border-sky-500 rounded px-2 py-1 text-base font-semibold text-slate-100 outline-none"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter')  { e.preventDefault(); commitTitle(); }
                if (e.key === 'Escape') { setTitleDraft(checklist.title); setEditingTitle(false); }
              }}
            />
          ) : (
            <button
              onClick={() => setEditingTitle(true)}
              className="text-base font-semibold text-slate-100 text-left w-full hover:bg-white/5 rounded px-1 -ml-1 py-0.5 transition-colors"
            >
              {checklist.title}
            </button>
          )}
        </div>
        <button
          onClick={() => deleteChecklist(cardId, checklist.id)}
          className="text-xs text-slate-400 hover:text-red-400 hover:bg-white/10 px-2 py-1 rounded transition-colors shrink-0"
        >
          Delete
        </button>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2 pl-8">
        <span className={`w-8 text-xs text-right shrink-0 tabular-nums ${pct === 100 ? 'text-emerald-400' : 'text-slate-300'}`}>
          {pct}%
        </span>
        <div className="h-2 bg-white/10 rounded-full flex-1 overflow-hidden">
          <div
            ref={progressRef}
            className={`h-full rounded-full transition-all duration-300 ${pct === 100 ? 'bg-emerald-500' : 'bg-sky-500'}`}
          />
        </div>
      </div>

      {/* Items */}
      {total > 0 && (
        <ul className="flex flex-col pl-8">
          {checklist.items.map((item) => (
            <li key={item.id} className="flex items-center gap-2 hover:bg-white/5 rounded px-2 py-1.5 group">
              {/* Checkbox */}
              <button
                onClick={() => toggleChecklistItem(cardId, checklist.id, item.id)}
                aria-label={item.completed ? 'Mark incomplete' : 'Mark complete'}
                className={`h-4 w-4 rounded-sm border-2 shrink-0 flex items-center justify-center transition-colors ${
                  item.completed ? 'bg-sky-500 border-sky-500' : 'border-slate-400 hover:border-slate-300'
                }`}
              >
                {item.completed && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>

              {/* Text / inline rename */}
              {editingItemId === item.id ? (
                <input
                  autoFocus
                  title="Checklist item"
                  className="flex-1 bg-trello-cardBg border border-sky-500 rounded px-2 py-0.5 text-sm text-slate-100 outline-none"
                  value={editingItemText}
                  onChange={(e) => setEditingItemText(e.target.value)}
                  onBlur={() => commitItemRename(item.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter')  { e.preventDefault(); commitItemRename(item.id); }
                    if (e.key === 'Escape') { setEditingItemId(null); }
                  }}
                />
              ) : (
                <span
                  onClick={() => { setEditingItemId(item.id); setEditingItemText(item.text); }}
                  className={`flex-1 text-sm cursor-pointer select-none leading-snug ${
                    item.completed ? 'line-through text-slate-500' : 'text-slate-100 hover:text-white'
                  }`}
                >
                  {item.text}
                </span>
              )}

              {/* Delete */}
              <button
                onClick={() => deleteChecklistItem(cardId, checklist.id, item.id)}
                aria-label="Delete item"
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/10 text-slate-400 hover:text-red-400 transition-opacity"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Add item form */}
      <div className="pl-8">
        {addingItem ? (
          <div className="flex flex-col gap-2">
            <textarea
              ref={addRef}
              autoFocus
              rows={2}
              placeholder="Add an item"
              className="w-full bg-trello-cardBg border border-sky-500 rounded px-3 py-2 text-sm text-slate-100 resize-none outline-none placeholder:text-slate-500"
              value={newItemText}
              onChange={(e) => { setNewItemText(e.target.value); autoResize(e.target); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submitNewItem();
                  setTimeout(() => addRef.current?.focus(), 0);
                }
                if (e.key === 'Escape') { setAddingItem(false); setNewItemText(''); }
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => { submitNewItem(); addRef.current?.focus(); }}
                className="bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium px-3 py-1.5 rounded transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => { setAddingItem(false); setNewItemText(''); }}
                className="text-slate-400 hover:text-slate-200 hover:bg-white/10 text-sm px-3 py-1.5 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingItem(true)}
            className="text-sm text-slate-400 hover:text-slate-200 hover:bg-white/10 px-2 py-1.5 rounded w-full text-left transition-colors"
          >
            Add an item
          </button>
        )}
      </div>
    </div>
  );
}
