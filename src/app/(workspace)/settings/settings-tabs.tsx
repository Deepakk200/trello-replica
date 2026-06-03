"use client";

import { useState, useEffect, type ComponentProps } from "react";
import { useRouter } from "next/navigation";
import { updateWorkspace, inviteMember, removeMember } from "@/features/workspaces/actions";
import { createApiKey, listApiKeys, revokeApiKey } from "@/features/enterprise/api-keys";
import { createWebhook, listWebhooks, deleteWebhook } from "@/features/enterprise/webhooks";
import { getAuditLogs } from "@/features/enterprise/audit";
import { UploadButton } from "@/lib/uploadthing";
import { BillingTab } from "@/components/settings/billing-tab";

type Member = { id: string; name: string | null; email: string; avatarUrl: string | null; role: string };
type ApiKeyRow = Awaited<ReturnType<typeof listApiKeys>>[number];
type WebhookRow = Awaited<ReturnType<typeof listWebhooks>>[number];
type AuditRow = Awaited<ReturnType<typeof getAuditLogs>>[number];

const TABS = ["general", "members", "billing", "keys", "webhooks", "audit"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = { general: "General", members: "Members", billing: "Billing", keys: "API Keys", webhooks: "Webhooks", audit: "Audit Log" };
const WEBHOOK_EVENTS = ["card.created", "card.moved", "card.deleted", "comment.added", "list.created", "list.deleted"];

const field = "w-full bg-trello-cardBg border border-trello-borderSubtle focus:border-trello-accent rounded px-3 py-2 text-sm text-trello-text outline-none";

export function SettingsTabs({
  workspace, members: initialMembers, myUserId, myRole, billing,
}: {
  workspace: { id: string; name: string; slug: string };
  members: Member[];
  myUserId: string;
  myRole: string;
  billing: ComponentProps<typeof BillingTab>;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("general");
  const isAdmin = myRole === "OWNER" || myRole === "ADMIN";

  return (
    <div>
      <div className="flex gap-1 border-b border-trello-border mb-5">
        {TABS.filter((t) => t !== "audit" || isAdmin).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm font-medium -mb-px border-b-2 transition-colors ${
              tab === t ? "border-trello-accent text-trello-text" : "border-transparent text-trello-textSubtle hover:text-trello-text"
            }`}
          >
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>

      {tab === "general" && <GeneralTab workspace={workspace} me={initialMembers.find((m) => m.id === myUserId) ?? null} />}
      {tab === "members" && <MembersTab initialMembers={initialMembers} myUserId={myUserId} isAdmin={isAdmin} />}
      {tab === "billing" && <BillingTab {...billing} />}
      {tab === "keys" && <KeysTab />}
      {tab === "webhooks" && <WebhooksTab />}
      {tab === "audit" && isAdmin && <AuditTab />}
    </div>
  );
}

function GeneralTab({ workspace, me }: { workspace: { name: string; slug: string }; me: Member | null }) {
  const [name, setName] = useState(workspace.name);
  const [saved, setSaved] = useState(false);
  async function save() {
    await updateWorkspace({ name });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }
  const [avatarMsg, setAvatarMsg] = useState("");
  return (
    <div className="flex flex-col gap-5 max-w-md">
      <div>
        <label className="block text-xs text-trello-textSubtle mb-2">Your profile</label>
        <div className="flex items-center gap-3">
          {me?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={me.avatarUrl} alt={me.name ?? "You"} className="w-12 h-12 rounded-full object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-linear-to-br from-pink-400 to-orange-400 flex items-center justify-center text-sm font-bold text-white">
              {(me?.name?.[0] ?? me?.email[0] ?? "?").toUpperCase()}
            </div>
          )}
          <div>
            <UploadButton
              endpoint="userAvatar"
              onClientUploadComplete={() => setAvatarMsg("Avatar updated — reload to see it everywhere.")}
              onUploadError={(err) => setAvatarMsg(err.message)}
              appearance={{ button: "text-xs px-3 py-1.5 bg-trello-primary text-trello-textOnBold rounded", allowedContent: "text-[10px] text-trello-textSubtle" }}
            />
            {avatarMsg && <p className="text-xs text-trello-textSecondary mt-1">{avatarMsg}</p>}
          </div>
        </div>
      </div>
      <div>
        <label className="block text-xs text-trello-textSubtle mb-1">Workspace name</label>
        <input className={field} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="block text-xs text-trello-textSubtle mb-1">Slug</label>
        <input className={`${field} opacity-60`} value={workspace.slug} disabled />
      </div>
      <div className="flex items-center gap-3">
        <button onClick={save} className="btn-primary text-sm px-4 py-2">Save</button>
        {saved && <span className="text-sm text-green-400">Saved</span>}
      </div>
      <div className="border-t border-trello-border pt-4 mt-2">
        <p className="text-xs font-semibold text-trello-danger uppercase tracking-wide mb-2">Danger zone</p>
        <button disabled className="text-sm px-4 py-2 rounded border border-trello-danger/40 text-trello-danger opacity-50 cursor-not-allowed">
          Delete workspace (Coming in Phase 6)
        </button>
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  return <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-trello-cardHover text-trello-textSecondary">{role}</span>;
}

function MembersTab({ initialMembers, myUserId, isAdmin }: { initialMembers: Member[]; myUserId: string; isAdmin: boolean }) {
  const [members, setMembers] = useState(initialMembers);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  async function invite() {
    if (!email.trim()) return;
    try {
      await inviteMember({ email: email.trim(), role: "MEMBER" });
      setMsg(`Invitation sent to ${email}`);
      setEmail("");
    } catch (e) {
      setMsg((e as Error).message);
    }
    setTimeout(() => setMsg(""), 2500);
  }
  async function remove(id: string) {
    try {
      await removeMember(id);
      setMembers((prev) => prev.filter((m) => m.id !== id));
    } catch (e) {
      setMsg((e as Error).message);
      setTimeout(() => setMsg(""), 2500);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-3 py-2 border-b border-trello-borderSubtle">
            <div className="w-8 h-8 rounded-full bg-linear-to-br from-pink-400 to-orange-400 flex items-center justify-center text-xs font-bold text-white">
              {(m.name?.[0] ?? m.email[0] ?? "?").toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-trello-text truncate">{m.name ?? m.email}</p>
              <p className="text-xs text-trello-textSubtle truncate">{m.email}</p>
            </div>
            <RoleBadge role={m.role} />
            {isAdmin && m.role !== "OWNER" && m.id !== myUserId && (
              <button onClick={() => remove(m.id)} className="text-xs text-trello-danger hover:underline">Remove</button>
            )}
          </div>
        ))}
      </div>

      {isAdmin && (
        <div className="flex flex-col gap-2 max-w-md">
          <label className="text-xs text-trello-textSubtle">Invite by email</label>
          <div className="flex gap-2">
            <input className={field} placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button onClick={invite} className="btn-primary text-sm px-4 py-2 shrink-0">Invite</button>
          </div>
        </div>
      )}
      {msg && <p className="text-sm text-trello-textSecondary">{msg}</p>}
    </div>
  );
}

function KeysTab() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [name, setName] = useState("");
  const [rawKey, setRawKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() { setKeys(await listApiKeys()); setLoading(false); }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!name.trim()) return;
    const r = await createApiKey(name.trim());
    if (r.ok) { setRawKey(r.apiKey.rawKey); setName(""); load(); }
  }
  async function revoke(id: string) { await revokeApiKey(id); load(); }

  return (
    <div className="flex flex-col gap-4 max-w-xl">
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="block text-xs text-trello-textSubtle mb-1">New key name</label>
          <input className={field} placeholder="CI deploy token" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <button onClick={create} className="btn-primary text-sm px-4 py-2">Create API Key</button>
      </div>

      {rawKey && (
        <div className="bg-trello-cardBg border border-trello-accent rounded p-3 flex flex-col gap-2">
          <p className="text-xs text-trello-danger">Copy this key now — it is shown once and cannot be recovered.</p>
          <div className="flex gap-2">
            <code className="flex-1 text-xs text-trello-text bg-black/30 rounded px-2 py-1.5 break-all">{rawKey}</code>
            <button onClick={() => navigator.clipboard.writeText(rawKey)} className="btn-soft text-xs px-3">Copy</button>
            <button onClick={() => setRawKey(null)} className="btn-ghost text-xs px-2">Dismiss</button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1">
        {loading ? <p className="text-sm text-trello-textSubtle">Loading…</p>
          : keys.length === 0 ? <p className="text-sm text-trello-textSubtle italic">No API keys.</p>
          : keys.map((k) => (
            <div key={k.id} className="flex items-center gap-3 py-2 border-b border-trello-borderSubtle">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-trello-text">{k.name}</p>
                <p className="text-xs text-trello-textSubtle font-mono">{k.keyPrefix}… · created {new Date(k.createdAt).toLocaleDateString()}{k.lastUsedAt ? ` · last used ${new Date(k.lastUsedAt).toLocaleDateString()}` : ""}</p>
              </div>
              <button onClick={() => revoke(k.id)} className="text-xs text-trello-danger hover:underline">Revoke</button>
            </div>
          ))}
      </div>
    </div>
  );
}

function WebhooksTab() {
  const [hooks, setHooks] = useState<WebhookRow[]>([]);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function load() { setHooks(await listWebhooks()); setLoading(false); }
  useEffect(() => { load(); }, []);

  function toggleEvent(e: string) {
    setEvents((prev) => prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]);
  }
  async function add() {
    setErr("");
    try {
      await createWebhook({ url, events });
      setUrl(""); setEvents([]); load();
    } catch (e) { setErr((e as Error).message); }
  }
  async function del(id: string) { await deleteWebhook(id); load(); }

  return (
    <div className="flex flex-col gap-4 max-w-xl">
      <div className="flex flex-col gap-2 bg-trello-cardBg/40 border border-trello-borderSubtle rounded p-3">
        <label className="text-xs text-trello-textSubtle">Endpoint URL</label>
        <input className={field} placeholder="https://example.com/webhook" value={url} onChange={(e) => setUrl(e.target.value)} />
        <label className="text-xs text-trello-textSubtle mt-1">Events</label>
        <div className="grid grid-cols-2 gap-1.5">
          {WEBHOOK_EVENTS.map((e) => (
            <label key={e} className="flex items-center gap-2 text-xs text-trello-textSecondary">
              <input type="checkbox" checked={events.includes(e)} onChange={() => toggleEvent(e)} />
              {e}
            </label>
          ))}
        </div>
        <button onClick={add} disabled={!url || events.length === 0} className="btn-primary text-sm px-4 py-2 mt-1 self-start disabled:opacity-50">Add webhook</button>
        {err && <p className="text-xs text-trello-danger">{err}</p>}
      </div>

      <div className="flex flex-col gap-1">
        {loading ? <p className="text-sm text-trello-textSubtle">Loading…</p>
          : hooks.length === 0 ? <p className="text-sm text-trello-textSubtle italic">No webhooks.</p>
          : hooks.map((h) => (
            <div key={h.id} className="flex items-center gap-3 py-2 border-b border-trello-borderSubtle">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-trello-text truncate">{h.url}</p>
                <p className="text-xs text-trello-textSubtle truncate">{h.events.join(", ")}{h.lastFiredAt ? ` · last fired ${new Date(h.lastFiredAt).toLocaleString()}` : ""}</p>
              </div>
              <button onClick={() => del(h.id)} className="text-xs text-trello-danger hover:underline">Delete</button>
            </div>
          ))}
      </div>
    </div>
  );
}

function AuditTab() {
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [page, setPage] = useState(0);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadPage(p: number) {
    setLoading(true);
    const rows = await getAuditLogs(p, 50);
    setLogs((prev) => (p === 0 ? rows : [...prev, ...rows]));
    if (rows.length < 50) setDone(true);
    setLoading(false);
  }
  useEffect(() => { loadPage(0); }, []);

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-[140px_1fr_120px] gap-2 text-[10px] uppercase tracking-wide text-trello-textSubtle px-2">
        <span>Time</span><span>User · Action</span><span>IP</span>
      </div>
      {logs.map((l) => (
        <div key={l.id} className="grid grid-cols-[140px_1fr_120px] gap-2 text-xs text-trello-textSecondary px-2 py-1.5 border-b border-trello-borderSubtle">
          <span className="text-trello-textSubtle">{new Date(l.createdAt).toLocaleString()}</span>
          <span className="text-trello-text truncate">{l.user.name ?? l.user.email} — <span className="font-mono">{l.action}</span> <span className="text-trello-textSubtle">({l.resource})</span></span>
          <span className="font-mono truncate">{l.ipAddress ?? "—"}</span>
        </div>
      ))}
      {loading && <p className="text-sm text-trello-textSubtle px-2 py-2">Loading…</p>}
      {!loading && logs.length === 0 && <p className="text-sm text-trello-textSubtle italic px-2 py-2">No audit entries yet.</p>}
      {!done && !loading && logs.length > 0 && (
        <button onClick={() => { const n = page + 1; setPage(n); loadPage(n); }} className="btn-soft text-xs px-3 py-1.5 self-start mt-2">Load more</button>
      )}
    </div>
  );
}
