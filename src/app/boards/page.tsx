// DB-backed workspace home (Trello-style). Shell (top nav + workspace sidebar)
// from BoardsShell; content leads with the active workspace identity header,
// then the template strip, then "Your boards". Server Component.

import Link from "next/link";
import { Lock, Pencil, User } from "lucide-react";
import { db } from "@/lib/db";
import { getMyWorkspacesWithBoards, getSharedBoards } from "@/features/boards/actions";
import { getActiveWorkspaceId, getSessionUser } from "@/lib/authz";
import { TemplatesRow } from "@/components/db-board/templates-row";
import { OnboardingChecklist } from "@/components/ui/onboarding-checklist";
import { CreateBoardTile } from "@/components/db-board/create-board-tile";
import { BoardsShell } from "@/components/workspace/boards-shell";

export const dynamic = "force-dynamic";

// Deterministic tile tint from the workspace name (DB has no avatarColor column).
const TINTS = ["#0079BF", "#D29034", "#519839", "#B04632", "#89609E", "#CD5A91", "#4BBF6B", "#00AECC"];
function tint(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
}

function BoardCard({ id, title, background }: { id: string; title: string; background: string }) {
  return (
    <Link
      href={`/board/${id}`}
      className="group h-24 rounded-lg overflow-hidden shadow-card flex flex-col bg-trello-surfaceRaised transition-transform hover:scale-[1.02] focus-visible:scale-[1.02]"
    >
      <span className="h-10 flex-shrink-0" style={{ background }} />
      <span className="flex-1 px-3 py-2 text-sm font-semibold text-trello-text line-clamp-2 text-left">{title}</span>
    </Link>
  );
}

export default async function BoardsPage() {
  const user = await getSessionUser();
  const [grouped, shared] = await Promise.all([
    getMyWorkspacesWithBoards(),
    getSharedBoards(),
  ]);

  const active = grouped.find((g) => g.isActive) ?? grouped[0] ?? null;
  const others = grouped.filter((g) => g !== active && g.boards.length > 0);
  const workspaceName = active?.workspaceName ?? "Workspace";
  const role = active?.role ?? "";

  // Onboarding signals — scoped to the ACTIVE workspace.
  const wId = user ? await getActiveWorkspaceId(user.id) : null;
  const [boardCount, cardCount, memberCount, attachmentCount] = wId
    ? await Promise.all([
        db.board.count({ where: { workspaceId: wId, deletedAt: null } }),
        db.card.count({ where: { list: { board: { workspaceId: wId } }, deletedAt: null } }),
        db.workspaceMember.count({ where: { workspaceId: wId } }),
        db.attachment.count({ where: { card: { list: { board: { workspaceId: wId } } } } }),
      ])
    : [0, 0, 0, 0];

  return (
    <BoardsShell workspaceName={workspaceName} role={role}>
      <div className="px-6 py-6 mx-auto max-w-5xl">
        {/* C. Workspace identity header */}
        <div className="flex items-center gap-3 pb-4 mb-6 border-b border-trello-border">
          <span
            className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
            style={{ background: tint(workspaceName) }}
          >
            {workspaceName[0]?.toUpperCase() ?? "W"}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-trello-text truncate">{workspaceName}</h1>
              <Link href="/settings" aria-label="Edit workspace" className="text-trello-textSubtle hover:text-trello-text">
                <Pencil size={14} />
              </Link>
            </div>
            <p className="flex items-center gap-1 text-xs text-trello-textSubtle mt-0.5">
              <Lock size={12} /> Private
            </p>
          </div>
        </div>

        {/* D. Template / featured strip */}
        <TemplatesRow />

        {/* E. Your boards */}
        <section className="mb-8">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-trello-text mb-3">
            <User size={16} /> Your boards
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {/* Default starter board — opens the full-chrome classic board view (/b),
                which renders the seeded "My Trello board" (lists + starter cards). */}
            <Link
              href="/b"
              className="group h-24 rounded-lg overflow-hidden shadow-card flex flex-col bg-trello-surfaceRaised transition-transform hover:scale-[1.02] focus-visible:scale-[1.02]"
            >
              <span className="h-10 flex-shrink-0" style={{ background: 'linear-gradient(135deg,#8b3dd6 0%,#c44ad0 55%,#e85a9c 100%)' }} />
              <span className="flex-1 px-3 py-2 text-sm font-semibold text-trello-text line-clamp-2 text-left">My Trello board</span>
            </Link>
            {active?.boards.map((b) => (
              <BoardCard key={b.id} id={b.id} title={b.title} background={b.background} />
            ))}
            <CreateBoardTile />
          </div>
        </section>

        {/* Other workspaces (secondary — keeps all data reachable) */}
        {others.map((g) => (
          <section key={g.workspaceId} className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold" style={{ background: tint(g.workspaceName) }}>
                {g.workspaceName[0]?.toUpperCase()}
              </span>
              <h2 className="text-sm font-semibold text-trello-text">{g.workspaceName}</h2>
              <span className="text-[10px] uppercase font-semibold tracking-wide text-trello-textSubtle bg-trello-cardHover px-1.5 py-0.5 rounded">{g.role}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {g.boards.map((b) => <BoardCard key={b.id} id={b.id} title={b.title} background={b.background} />)}
            </div>
          </section>
        ))}

        {/* Shared with you */}
        {shared.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-trello-text mb-3">Shared with you</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {shared.map((b) => <BoardCard key={b.id} id={b.id} title={b.title} background={b.background} />)}
            </div>
          </section>
        )}

        {/* F. Onboarding — demoted to the bottom (dismissible, hides when complete) */}
        <OnboardingChecklist
          hasCreatedBoard={boardCount > 0}
          hasCreatedCard={cardCount > 0}
          hasInvitedMember={memberCount > 1}
          hasUploadedFile={attachmentCount > 0}
        />
      </div>
    </BoardsShell>
  );
}
