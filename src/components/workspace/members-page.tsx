'use client';

// Workspace Members — DB-backed (single source of truth). Reads real members
// from the server page and mutates via the authz-gated server actions
// (inviteMember / changeRole / removeMember). The server enforces RBAC
// (admin-only); the UI mirrors that so non-admins see a read-only view.
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, UserPlus, X } from 'lucide-react';
import { inviteMember, changeRole, removeMember } from '@/features/workspaces/actions';
import type { WorkspaceRole } from '@prisma/client';

type Member = { id: string; name: string | null; email: string; avatarUrl: string | null; role: WorkspaceRole };

const ASSIGNABLE: WorkspaceRole[] = ['ADMIN', 'MEMBER', 'OBSERVER', 'GUEST'];
const PALETTE = ['#0079BF', '#00875A', '#E2483D', '#6554C0', '#FF991F', '#00B8D9'];
const field =
  'bg-white/[0.06] border border-white/15 focus:border-[#579DFF] rounded px-2.5 py-1.5 text-sm text-white outline-none transition-colors disabled:opacity-50';

function initials(name: string | null, email: string) {
  return ((name ?? '').trim() || email).slice(0, 2).toUpperCase();
}
function colorFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
function isEmail(v: string) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
}

export function WorkspaceMembersPage({ members, myUserId, myRole }: {
  members: Member[]; myUserId: string; myRole: WorkspaceRole;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const canManage = myRole === 'OWNER' || myRole === 'ADMIN';

  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<WorkspaceRole>('MEMBER');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  function sendInvite() {
    if (!isEmail(email.trim())) { setError('Enter a valid email address.'); return; }
    setError('');
    startTransition(async () => {
      try {
        await inviteMember({ email: email.trim(), role });
        setEmail(''); setRole('MEMBER'); setShowInvite(false);
        setNotice(`Invitation sent to ${email.trim()}.`);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to send invitation.');
      }
    });
  }
  function onChangeRole(userId: string, newRole: WorkspaceRole) {
    setError('');
    startTransition(async () => {
      try { await changeRole(userId, newRole); router.refresh(); }
      catch (e) { setError(e instanceof Error ? e.message : 'Failed to change role.'); }
    });
  }
  function onRemove(userId: string) {
    setError('');
    startTransition(async () => {
      try { await removeMember(userId); router.refresh(); }
      catch (e) { setError(e instanceof Error ? e.message : 'Failed to remove member.'); }
    });
  }

  return (
    <div className="px-6 py-6 md:px-10 max-w-[1000px]">
      <div className="flex items-center justify-between gap-4 mb-1">
        <h1 className="text-xl font-bold text-white">Workspace members ({members.length})</h1>
        {canManage && (
          <button
            onClick={() => { setShowInvite((v) => !v); setError(''); setNotice(''); }}
            className="flex items-center gap-1.5 h-8 px-3 rounded text-sm font-medium text-white disabled:opacity-50"
            style={{ background: '#0C66E4' }}
            disabled={pending}
          >
            <UserPlus size={15} /> Invite members
          </button>
        )}
      </div>
      <p className="text-sm text-white/55 mb-5">
        Workspace members can view and join boards in this workspace.
        {!canManage && <span className="ml-1 text-white/35">Only admins can manage members.</span>}
      </p>

      {notice && <p className="mb-4 text-sm text-[#4BCE97]">{notice}</p>}

      {canManage && showInvite && (
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
            <select value={role} onChange={(e) => setRole(e.target.value as WorkspaceRole)} className={field}>
              {ASSIGNABLE.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <button onClick={sendInvite} disabled={pending} className="h-8 px-3 rounded text-sm font-medium text-white disabled:opacity-50" style={{ background: '#0C66E4' }}>
              Send invite
            </button>
          </div>
        </div>
      )}

      {error && <p className="mb-4 text-sm text-[#F87168]">{error}</p>}

      {/* Members table */}
      <div className="rounded-xl border border-white/[0.08] overflow-hidden">
        {members.map((m, i) => {
          const isOwner = m.role === 'OWNER';
          const isSelf = m.id === myUserId;
          return (
            <div key={m.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-white/[0.06]' : ''}`}>
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 select-none bg-cover bg-center"
                style={m.avatarUrl ? { backgroundImage: `url(${m.avatarUrl})` } : { background: colorFor(m.id) }}
              >
                {m.avatarUrl ? '' : initials(m.name, m.email)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white truncate">{m.name ?? m.email}{isSelf && <span className="ml-1.5 text-xs text-white/40">(you)</span>}</p>
                <p className="text-xs text-white/50 truncate">{m.email}</p>
              </div>
              {canManage && !isOwner ? (
                <select
                  value={m.role}
                  onChange={(e) => onChangeRole(m.id, e.target.value as WorkspaceRole)}
                  className={field}
                  disabled={pending}
                  aria-label={`Role for ${m.name ?? m.email}`}
                >
                  {ASSIGNABLE.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              ) : (
                <span className="text-xs font-medium text-white/60 px-2.5 py-1.5 rounded bg-white/[0.06]">{m.role}</span>
              )}
              {canManage && !isOwner && !isSelf && (
                <button
                  onClick={() => onRemove(m.id)}
                  disabled={pending}
                  className="flex items-center gap-1 text-xs text-white/60 hover:text-[#F87168] px-2 py-1.5 rounded hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  <X size={13} /> Remove
                </button>
              )}
            </div>
          );
        })}
        {members.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-white/50">No members yet.</p>
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
