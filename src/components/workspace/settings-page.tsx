'use client';

// Workspace Settings — name/description + delete are DB-backed (authz-gated server
// actions, single source of truth). Workspace colour + visibility have no column
// on the DB Workspace model, so they remain device-local display preferences
// (clearly labelled) until/if the schema gains them.
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Globe, Lock, Trash2, X } from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { useBoardStore } from '@/store/use-board-store';
import { updateWorkspace, deleteWorkspace } from '@/features/workspaces/actions';
import type { WorkspaceVisibility } from '@/types';
import type { WorkspaceRole } from '@prisma/client';

const SWATCHES = [
  'linear-gradient(135deg,#22A06B,#1A7A4F)',
  'linear-gradient(135deg,#0079bf,#5067c5)',
  'linear-gradient(135deg,#d29034,#f5a623)',
  'linear-gradient(135deg,#b04632,#e2483d)',
  'linear-gradient(135deg,#89609e,#8e44ad)',
  '#026aa7',
];
const field =
  'bg-white/[0.06] border border-white/15 focus:border-[#579DFF] rounded px-3 py-2 text-sm text-white outline-none transition-colors disabled:opacity-50';

export function WorkspaceSettingsPage({ workspace, myRole }: {
  workspace: { id: string; name: string; description: string | null };
  myRole: WorkspaceRole;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const canManage = myRole === 'OWNER' || myRole === 'ADMIN';
  const isOwner = myRole === 'OWNER';

  const [name, setName] = useState(workspace.name);
  const [description, setDescription] = useState(workspace.description ?? '');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Device-local display preferences (no DB column).
  const { visibility, avatarColor } = useBoardStore(useShallow((s) => ({
    visibility: s.workspaceVisibility,
    avatarColor: s.workspaceAvatarColor,
  })));
  const setVisibility = useBoardStore((s) => s.setWorkspaceVisibility);
  const setAvatarColor = useBoardStore((s) => s.setWorkspaceAvatarColor);

  const dirty = name.trim() !== workspace.name || description !== (workspace.description ?? '');

  function save() {
    if (!canManage || !dirty) return;
    setError('');
    startTransition(async () => {
      try {
        await updateWorkspace({ name: name.trim() || workspace.name, description });
        setSaved(true); setTimeout(() => setSaved(false), 2000);
        router.refresh();
      } catch (e) { setError(e instanceof Error ? e.message : 'Failed to save changes.'); }
    });
  }
  function doDelete() {
    setError('');
    startTransition(async () => {
      try { await deleteWorkspace(workspace.id); router.push('/'); }
      catch (e) { setError(e instanceof Error ? e.message : 'Failed to delete workspace.'); setConfirmDelete(false); }
    });
  }

  return (
    <div className="px-6 py-6 md:px-10 max-w-[760px]">
      <h1 className="text-xl font-bold text-white mb-1">Workspace settings</h1>
      <p className="text-sm text-white/55 mb-6">
        {canManage ? 'Name and description are saved to the workspace.' : 'Only admins can edit workspace settings.'}
      </p>

      {/* Avatar + name */}
      <div className="flex items-start gap-4 mb-6">
        <div
          className="w-16 h-16 rounded-lg flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 select-none"
          style={{ background: avatarColor }}
        >
          {(name[0] ?? 'W').toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <label className="block text-xs text-white/50 mb-1">Workspace name</label>
          <input className={`${field} w-full`} value={name} disabled={!canManage} onChange={(e) => setName(e.target.value)} />
        </div>
      </div>

      {/* Description */}
      <div className="mb-4">
        <label className="block text-xs text-white/50 mb-1">Short description</label>
        <textarea
          rows={2}
          className={`${field} w-full resize-none`}
          placeholder="Let people know what this workspace is for."
          value={description}
          disabled={!canManage}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {canManage && (
        <div className="flex items-center gap-3 mb-6">
          <button onClick={save} disabled={pending || !dirty} className="btn-primary text-sm font-medium px-4 py-2 disabled:opacity-50">
            Save changes
          </button>
          {saved && <span className="inline-flex items-center gap-1 text-sm text-[#4BCE97]"><Check size={14} /> Saved</span>}
        </div>
      )}
      {error && <p className="mb-4 text-sm text-[#F87168]">{error}</p>}

      {/* Color picker — device-local */}
      <div className="mb-6">
        <label className="block text-xs text-white/50 mb-2">Workspace color <span className="text-white/30">· display preference (this device)</span></label>
        <div className="flex flex-wrap gap-2">
          {SWATCHES.map((sw) => (
            <button
              key={sw}
              onClick={() => setAvatarColor(sw)}
              aria-label="Workspace color"
              className={`w-9 h-9 rounded-md transition-transform ${avatarColor === sw ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1D2125]' : 'hover:scale-105'}`}
              style={{ background: sw }}
            />
          ))}
        </div>
      </div>

      {/* Visibility — device-local */}
      <div className="mb-6">
        <label className="block text-xs text-white/50 mb-2">Workspace visibility <span className="text-white/30">· display preference (this device)</span></label>
        <div className="flex flex-col gap-2">
          {([
            { v: 'private' as const, Icon: Lock, label: 'Private', hint: 'Only workspace members can see and join boards.' },
            { v: 'public' as const, Icon: Globe, label: 'Public', hint: 'Anyone on the internet can see this workspace.' },
          ]).map(({ v, Icon, label, hint }) => (
            <label
              key={v}
              className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
                visibility === v ? 'border-[#579DFF] bg-[#1C3D5A]/40' : 'border-white/10 hover:bg-white/[0.04]'
              }`}
            >
              <input
                type="radio" name="visibility" className="mt-1"
                checked={visibility === v}
                onChange={() => setVisibility(v as WorkspaceVisibility)}
              />
              <span>
                <span className="flex items-center gap-1.5 text-sm text-white"><Icon size={14} /> {label}</span>
                <span className="block text-xs text-white/50 mt-0.5">{hint}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Danger zone — real delete (owner only; server-enforced) */}
      {isOwner && (
        <div className="border-t border-white/[0.08] pt-5">
          <p className="text-xs font-semibold text-[#F87168] uppercase tracking-wide mb-2">Danger zone</p>
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 text-sm px-4 py-2 rounded border border-[#F87168]/40 text-[#F87168] hover:bg-[#F87168]/10 transition-colors"
          >
            <Trash2 size={14} /> Delete workspace
          </button>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center px-4" onClick={() => setConfirmDelete(false)}>
          <div className="w-full max-w-sm bg-[#282E33] border border-white/10 rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-base font-semibold text-white">Delete workspace?</h2>
              <button onClick={() => setConfirmDelete(false)} aria-label="Close" className="p-1 rounded hover:bg-white/10 text-white/60"><X size={18} /></button>
            </div>
            <div className="p-4">
              <p className="text-sm text-white/70 mb-4">
                This permanently removes the workspace and its boards. You can&apos;t delete your only workspace.
              </p>
              <div className="flex gap-2">
                <button onClick={doDelete} disabled={pending} className="flex-1 py-2 rounded text-sm font-medium text-white disabled:opacity-50" style={{ background: '#C9372C' }}>
                  Delete workspace
                </button>
                <button onClick={() => setConfirmDelete(false)} className="px-3 py-2 rounded text-sm text-white/70 hover:bg-white/10 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
