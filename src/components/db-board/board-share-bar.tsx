"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, X, Link2, Check } from "lucide-react";
import { addBoardMember, removeBoardMember, setBoardVisibility } from "@/features/boards/actions";

type Member = {
  userId: string;
  role: string;
  user: { id: string; name: string | null; email: string | null; avatarUrl: string | null };
};

type Visibility = "private" | "workspace" | "public";
const VISIBILITIES: { value: Visibility; label: string; hint: string }[] = [
  { value: "private", label: "Private", hint: "Only board members can see this board." },
  { value: "workspace", label: "Workspace", hint: "Everyone in the workspace can see and edit." },
  { value: "public", label: "Public", hint: "Anyone with the link can view (read-only)." },
];
const ROLES = ["MEMBER", "ADMIN", "OBSERVER"] as const;

function initials(m: Member["user"]): string {
  return (m.name?.[0] ?? m.email?.[0] ?? "?").toUpperCase();
}

export function BoardShareBar({
  boardId, members, visibility, canAdmin,
}: {
  boardId: string;
  members: Member[];
  visibility: string;
  canAdmin: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]>("MEMBER");
  const [msg, setMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();


  async function invite() {
    if (!email.trim()) return;
    const r = await addBoardMember(boardId, email.trim(), role);
    if (r.ok) { setEmail(""); setMsg("Added to board"); router.refresh(); }
    else setMsg(r.error ?? "Could not add member");
    setTimeout(() => setMsg(""), 3000);
  }
  function remove(userId: string) {
    start(async () => { await removeBoardMember(boardId, userId); router.refresh(); });
  }
  function changeVisibility(v: Visibility) {
    start(async () => { await setBoardVisibility(boardId, v); router.refresh(); });
  }
  function copyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 bg-white/90 hover:bg-white text-[#172B4D] font-medium px-3 py-1 rounded text-sm shadow-sm"
      >
        <UserPlus size={15} /> <span className="hidden sm:inline">Share</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] bg-black/50 flex items-start justify-center py-16 px-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md bg-trello-surfaceRaised border border-trello-border rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-trello-border">
              <h2 className="text-base font-semibold text-trello-text">Share board</h2>
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-trello-cardHover text-trello-textSubtle hover:text-trello-text"><X size={18} /></button>
            </div>

            <div className="p-4 flex flex-col gap-4">
              {canAdmin && (
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-trello-cardBg border border-trello-borderSubtle rounded px-3 py-2 text-sm text-trello-text outline-none"
                    placeholder="Add member by email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") invite(); }}
                  />
                  <select value={role} onChange={(e) => setRole(e.target.value as typeof role)} className="bg-trello-cardBg border border-trello-borderSubtle rounded px-2 text-sm text-trello-text">
                    {ROLES.map((r) => <option key={r} value={r}>{r[0] + r.slice(1).toLowerCase()}</option>)}
                  </select>
                  <button onClick={invite} className="btn-primary text-sm px-3 shrink-0">Add</button>
                </div>
              )}
              {msg && <p className="text-xs text-trello-textSecondary -mt-2">{msg}</p>}

              <div className="flex flex-col gap-1 max-h-52 overflow-y-auto">
                {members.length === 0 && <p className="text-sm text-trello-textSubtle italic">No board members yet. Workspace members can already access this board.</p>}
                {members.map((m) => (
                  <div key={m.userId} className="flex items-center gap-2.5 py-1.5">
                    <Avatar user={m.user} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-trello-text truncate">{m.user.name ?? m.user.email}</p>
                      <p className="text-xs text-trello-textSubtle truncate">{m.user.email}</p>
                    </div>
                    <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-trello-cardHover text-trello-textSecondary">{m.role}</span>
                    {canAdmin && (
                      <button disabled={pending} onClick={() => remove(m.userId)} className="text-xs text-trello-danger hover:underline">Remove</button>
                    )}
                  </div>
                ))}
              </div>

              <div className="border-t border-trello-border pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-trello-textSubtle mb-2">Visibility</p>
                <div className="flex flex-col gap-1.5">
                  {VISIBILITIES.map((v) => (
                    <label key={v.value} className={`flex items-start gap-2 rounded p-2 ${canAdmin ? "cursor-pointer hover:bg-trello-cardHover" : "opacity-70"}`}>
                      <input
                        type="radio" name="visibility" className="mt-0.5"
                        checked={visibility === v.value}
                        disabled={!canAdmin || pending}
                        onChange={() => changeVisibility(v.value)}
                      />
                      <span>
                        <span className="block text-sm text-trello-text">{v.label}</span>
                        <span className="block text-xs text-trello-textSubtle">{v.hint}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <button onClick={copyLink} className="flex items-center justify-center gap-1.5 btn-soft text-sm py-2">
                {copied ? <><Check size={14} /> Copied!</> : <><Link2 size={14} /> Copy link</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Avatar({ user }: { user: Member["user"] }) {
  return user.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={user.avatarUrl} alt={user.name ?? "Member"} title={user.name ?? user.email ?? ""} className="w-7 h-7 rounded-full object-cover ring-2 ring-black/10" />
  ) : (
    <div title={user.name ?? user.email ?? ""} className="w-7 h-7 rounded-full bg-linear-to-br from-pink-400 to-orange-400 text-white text-[11px] font-bold flex items-center justify-center ring-2 ring-black/10">
      {initials(user)}
    </div>
  );
}
