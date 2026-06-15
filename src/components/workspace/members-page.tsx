'use client';

// Workspace Members page (FRONTEND MOCK — swap to DB-backed users + real email
// invites in the workspaces/RBAC phase). State lives in the persisted store.
import { useState } from 'react';
import { Plus, UserPlus, X } from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { useBoardStore, useHasHydrated } from '@/store/use-board-store';
import type { WorkspaceMemberRole } from '@/types';

const ROLES: WorkspaceMemberRole[] = ['Admin', 'Member', 'Observer'];
const field =
  'bg-white/[0.06] border border-white/15 focus:border-[#579DFF] rounded px-2.5 py-1.5 text-sm text-white outline-none transition-colors';

function initials(name: string, email: string) {
  const base = name.trim() || email;
  return base.slice(0, 2).toUpperCase();
}

function isEmail(v: string) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
}

export function WorkspaceMembersPage() {
  const hydrated = useHasHydrated();
  const members = useBoardStore(useShallow((s) => s.workspaceMembers));
  const invite = useBoardStore((s) => s.inviteWorkspaceMember);
  const changeRole = useBoardStore((s) => s.changeWorkspaceMemberRole);
  const remove = useBoardStore((s) => s.removeWorkspaceMember);

  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<WorkspaceMemberRole>('Member');
  const [error, setError] = useState('');

  function sendInvite() {
    if (!isEmail(email.trim())) { setError('Enter a valid email address.'); return; }
    invite('', email.trim(), role);
    setEmail(''); setRole('Member'); setError(''); setShowInvite(false);
  }

  if (!hydrated) {
    return <div className="px-6 py-6 md:px-10"><div className="h-10 w-72 rounded bg-white/5 animate-pulse" /></div>;
  }

  return (
    <div className="px-6 py-6 md:px-10 max-w-[1000px]">
      <div className="flex items-center justify-between gap-4 mb-1">
        <h1 className="text-xl font-bold text-white">Workspace members ({members.length})</h1>
        <button
          onClick={() => { setShowInvite((v) => !v); setError(''); }}
          className="flex items-center gap-1.5 h-8 px-3 rounded text-sm font-medium text-white"
          style={{ background: '#0C66E4' }}
        >
          <UserPlus size={15} /> Invite members
        </button>
      </div>
      <p className="text-sm text-white/55 mb-5">
        Workspace members can view and join boards in this workspace.
        <span className="ml-1 text-white/35">(Mock data — real invites arrive in the workspaces phase.)</span>
      </p>

      {showInvite && (
        <div className="mb-6 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 flex flex-col gap-2">
          <p className="text-sm font-semibold text-white">Invite by email</p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              autoFocus type="email" placeholder="name@example.com"
              className={`${field} flex-1 min-w-[200px]`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') sendInvite(); if (e.key === 'Escape') setShowInvite(false); }}
            />
            <select value={role} onChange={(e) => setRole(e.target.value as WorkspaceMemberRole)} className={field}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <button onClick={sendInvite} className="h-8 px-3 rounded text-sm font-medium text-white" style={{ background: '#0C66E4' }}>
              Send invite
            </button>
          </div>
          {error && <p className="text-xs text-[#F87168]">{error}</p>}
        </div>
      )}

      {/* Members table */}
      <div className="rounded-xl border border-white/[0.08] overflow-hidden">
        {members.map((m, i) => (
          <div
            key={m.id}
            className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-white/[0.06]' : ''}`}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 select-none"
              style={{ background: m.avatarColor }}
            >
              {initials(m.name, m.email)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-white truncate">{m.name}</p>
              <p className="text-xs text-white/50 truncate">{m.email}</p>
            </div>
            <select
              value={m.role}
              onChange={(e) => changeRole(m.id, e.target.value as WorkspaceMemberRole)}
              className={field}
              aria-label={`Role for ${m.name}`}
            >
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <button
              onClick={() => remove(m.id)}
              className="flex items-center gap-1 text-xs text-white/60 hover:text-[#F87168] px-2 py-1.5 rounded hover:bg-white/5 transition-colors"
            >
              <X size={13} /> Remove
            </button>
          </div>
        ))}
        {members.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-white/50">No members yet. Invite someone above.</p>
        )}
      </div>

      {/* Guests */}
      <h2 className="text-base font-semibold text-white mt-8 mb-2">Guests</h2>
      <div className="rounded-xl border border-dashed border-white/[0.12] px-4 py-8 text-center">
        <Plus size={20} className="mx-auto text-white/30 mb-1" />
        <p className="text-sm text-white/50">No guests yet.</p>
        <p className="text-xs text-white/35 mt-0.5">Guests have access to specific boards rather than the whole workspace.</p>
      </div>
    </div>
  );
}
