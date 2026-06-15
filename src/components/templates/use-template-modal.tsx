"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useShallow } from "zustand/shallow";
import { useBoardStore } from "@/store/use-board-store";
import { createBoardFromGalleryTemplate } from "@/features/templates/clone";
import type { GalleryTemplate } from "@/data/templates";

const BACKGROUNDS = [
  "linear-gradient(135deg,#0079bf,#5067c5)",
  "linear-gradient(135deg,#519839,#4bce97)",
  "linear-gradient(135deg,#b04632,#e2483d)",
  "linear-gradient(135deg,#89609e,#b388eb)",
  "linear-gradient(135deg,#d29034,#f5a623)",
  "linear-gradient(135deg,#172b4d,#0052cc)",
];

export function UseTemplateModal({ template, onClose }: { template: GalleryTemplate; onClose: () => void }) {
  const router = useRouter();
  const { workspaces, activeWorkspaceId } = useBoardStore(
    useShallow((s) => ({ workspaces: s.workspaces, activeWorkspaceId: s.activeWorkspaceId })),
  );
  const wsList = Object.values(workspaces);

  const [name, setName] = useState(template.title);
  const [wsId, setWsId] = useState(activeWorkspaceId ?? wsList[0]?.id ?? "");
  const [bg, setBg] = useState(template.previewColor);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  function create() {
    if (!name.trim() || creating) return;
    setCreating(true);
    createBoardFromGalleryTemplate(template, {
      name: name.trim(),
      workspaceId: wsId || undefined,
      background: bg,
    });
    // The clone sets the new board active; /b renders the active board.
    router.push("/b");
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/60 flex items-start justify-center py-16 px-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-trello-surfaceRaised border border-trello-border rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-trello-border">
          <h2 className="text-base font-semibold text-trello-text">Create board from template</h2>
          <button onClick={onClose} aria-label="Close" className="p-1 rounded hover:bg-trello-cardHover text-trello-textSubtle hover:text-trello-text"><X size={18} /></button>
        </div>

        <div className="p-4 flex flex-col gap-4">
          <div className="h-20 rounded-lg" style={{ background: bg }} />

          <div>
            <label className="block text-xs text-trello-textSubtle mb-1">Board title</label>
            <input
              autoFocus value={name} onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") create(); }}
              className="w-full bg-trello-cardBg border border-trello-borderSubtle focus:border-trello-accent rounded px-3 py-2 text-sm text-trello-text outline-none"
            />
          </div>

          {wsList.length > 0 && (
            <div>
              <label className="block text-xs text-trello-textSubtle mb-1">Workspace</label>
              <select
                value={wsId} onChange={(e) => setWsId(e.target.value)}
                className="w-full bg-trello-cardBg border border-trello-borderSubtle rounded px-3 py-2 text-sm text-trello-text outline-none"
              >
                {wsList.map((ws) => <option key={ws.id} value={ws.id}>{ws.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs text-trello-textSubtle mb-1">Background</label>
            <div className="flex flex-wrap gap-2">
              {[template.previewColor, ...BACKGROUNDS.filter((b) => b !== template.previewColor)].map((b) => (
                <button
                  key={b} onClick={() => setBg(b)} title="Background"
                  className={`w-9 h-9 rounded-md ${bg === b ? "ring-2 ring-trello-accent ring-offset-2 ring-offset-trello-surfaceRaised" : ""}`}
                  style={{ background: b }}
                />
              ))}
            </div>
          </div>

          <button onClick={create} disabled={!name.trim() || creating} className="btn-primary w-full py-2 text-sm font-medium disabled:opacity-50">
            {creating ? "Creating…" : "Create board"}
          </button>
        </div>
      </div>
    </div>
  );
}
