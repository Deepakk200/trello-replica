"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus, Check } from "lucide-react";
import { switchWorkspace, createWorkspace } from "@/features/workspaces/actions";

export type WorkspaceOption = {
  id: string;
  name: string;
  role: string;
  memberCount: number;
  boardCount: number;
  isActive: boolean;
};

export function DbWorkspaceSwitcher({ workspaces }: { workspaces: WorkspaceOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [pending, start] = useTransition();

  const active = workspaces.find((w) => w.isActive) ?? workspaces[0];

  function pick(id: string) {
    if (id === active?.id) { setOpen(false); return; }
    start(async () => { await switchWorkspace(id); setOpen(false); router.refresh(); });
  }
  function create() {
    const n = name.trim();
    if (!n) return;
    start(async () => { await createWorkspace(n); setName(""); setCreating(false); setOpen(false); router.refresh(); });
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 bg-trello-cardBg border border-trello-border rounded-lg px-3 py-2 text-sm text-trello-text hover:bg-trello-cardHover"
      >
        <span className="w-6 h-6 rounded bg-linear-to-br from-sky-500 to-indigo-500 text-white text-xs font-bold flex items-center justify-center">
          {(active?.name?.[0] ?? "W").toUpperCase()}
        </span>
        <span className="font-medium max-w-[160px] truncate">{active?.name ?? "Workspace"}</span>
        <ChevronDown size={15} className="text-trello-textSubtle" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => { setOpen(false); setCreating(false); }} />
          <div className="absolute left-0 top-full mt-1 z-30 w-72 bg-trello-surfaceRaised border border-trello-border rounded-lg shadow-xl p-1.5">
            <p className="px-2 py-1 text-[10px] uppercase tracking-wide text-trello-textSubtle">Your workspaces</p>
            <div className="max-h-64 overflow-y-auto">
              {workspaces.map((w) => (
                <button
                  key={w.id}
                  onClick={() => pick(w.id)}
                  disabled={pending}
                  className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded hover:bg-trello-cardHover text-left"
                >
                  <span className="w-7 h-7 rounded bg-linear-to-br from-sky-500 to-indigo-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {w.name[0]?.toUpperCase()}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm text-trello-text truncate">{w.name}</span>
                    <span className="block text-[11px] text-trello-textSubtle">{w.role} · {w.boardCount} boards · {w.memberCount} members</span>
                  </span>
                  {w.isActive && <Check size={15} className="text-emerald-400 shrink-0" />}
                </button>
              ))}
            </div>

            <div className="border-t border-trello-border mt-1.5 pt-1.5">
              {creating ? (
                <div className="flex gap-1.5 px-1">
                  <input
                    autoFocus value={name} onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") create(); if (e.key === "Escape") setCreating(false); }}
                    placeholder="Workspace name"
                    className="flex-1 bg-trello-cardBg border border-trello-borderSubtle rounded px-2 py-1.5 text-sm text-trello-text outline-none"
                  />
                  <button onClick={create} disabled={pending} className="btn-primary text-xs px-3">Create</button>
                </div>
              ) : (
                <button onClick={() => setCreating(true)} className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-trello-cardHover text-sm text-trello-text">
                  <Plus size={15} /> Create workspace
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
