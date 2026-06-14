// DB-backed boards landing — grouped by workspace, with shared boards and a
// workspace switcher (Phase 3). Server Component.

import Link from "next/link";
import { db } from "@/lib/db";
import { getMyWorkspacesWithBoards, getSharedBoards } from "@/features/boards/actions";
import { listMyWorkspaces } from "@/features/workspaces/actions";
import { getActiveWorkspaceId, getSessionUser } from "@/lib/authz";
import { DbWorkspaceSwitcher } from "@/components/ui/db-workspace-switcher";
import { TemplatesRow } from "@/components/db-board/templates-row";
import { OnboardingChecklist } from "@/components/ui/onboarding-checklist";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

function BoardCard({ id, title, background, lists }: { id: string; title: string; background: string; lists: number }) {
  return (
    <Link
      href={`/board/${id}`}
      className="group relative h-24 rounded-lg overflow-hidden shadow-card flex flex-col justify-between p-3 transition-transform hover:scale-[1.02]"
      style={{ background }}
    >
      <span className="text-sm font-semibold text-white drop-shadow line-clamp-2">{title}</span>
      <span className="text-[11px] text-white/80">{lists} lists</span>
    </Link>
  );
}

export default async function BoardsPage() {
  const user = await getSessionUser();
  const [workspaces, grouped, shared] = await Promise.all([
    listMyWorkspaces(),
    getMyWorkspacesWithBoards(),
    getSharedBoards(),
  ]);

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
  const showOnboarding = boardCount < 3;

  const totalBoards = grouped.reduce((s, g) => s + g.boards.length, 0) + shared.length;

  return (
    <main className="min-h-screen bg-trello-bg px-6 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          <h1 className="text-xl font-bold text-trello-text">Your Boards</h1>
          <div className="flex items-center gap-2">
            <DbWorkspaceSwitcher workspaces={workspaces} />
            <Link href="/settings" className="text-sm text-trello-textSubtle hover:text-trello-text px-3 py-2">Settings</Link>
          </div>
        </div>

        {showOnboarding && (
          <OnboardingChecklist
            hasCreatedBoard={boardCount > 0}
            hasCreatedCard={cardCount > 0}
            hasInvitedMember={memberCount > 1}
            hasUploadedFile={attachmentCount > 0}
          />
        )}

        <TemplatesRow />

        {totalBoards === 0 ? (
          <EmptyState
            title="No boards yet"
            subtitle="Pick a template above to create your first board and start organising your work."
          />
        ) : (
          <div className="flex flex-col gap-8">
            {grouped.map((g) => (
              <section key={g.workspaceId}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-7 h-7 rounded bg-linear-to-br from-sky-500 to-indigo-500 text-white text-xs font-bold flex items-center justify-center">
                    {g.workspaceName[0]?.toUpperCase()}
                  </span>
                  <h2 className="text-sm font-semibold text-trello-text">{g.workspaceName}</h2>
                  <span className="text-[10px] uppercase font-semibold tracking-wide text-trello-textSubtle bg-trello-cardHover px-1.5 py-0.5 rounded">{g.role}</span>
                  {g.isActive && <span className="text-[10px] uppercase tracking-wide text-emerald-400">Active</span>}
                </div>
                {g.boards.length === 0 ? (
                  <p className="text-sm text-trello-textSubtle italic">No boards in this workspace.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {g.boards.map((b) => <BoardCard key={b.id} id={b.id} title={b.title} background={b.background} lists={b._count.lists} />)}
                  </div>
                )}
              </section>
            ))}

            {shared.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-trello-text mb-3">Shared with you</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {shared.map((b) => <BoardCard key={b.id} id={b.id} title={b.title} background={b.background} lists={b._count.lists} />)}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
