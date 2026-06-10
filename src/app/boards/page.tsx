// DB-backed board grid (Phase 1, incremental).
// Server Component — fetches boards from PostgreSQL. Lives alongside the
// existing localStorage app at "/"; the two are migrated together in later batches.

import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getBoards } from "@/features/boards/actions";
import { TemplatesRow } from "@/components/db-board/templates-row";
import { OnboardingChecklist } from "@/components/ui/onboarding-checklist";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

export default async function BoardsPage() {
  const boards = await getBoards();

  // Onboarding signals — only fetched for the current workspace.
  const session = await auth();
  const wId = session?.user?.workspaceId ?? "";
  const [boardCount, cardCount, memberCount, attachmentCount] = wId
    ? await Promise.all([
        db.board.count({ where: { workspaceId: wId, deletedAt: null } }),
        db.card.count({ where: { list: { board: { workspaceId: wId } }, deletedAt: null } }),
        db.workspaceMember.count({ where: { workspaceId: wId } }),
        db.attachment.count({ where: { card: { list: { board: { workspaceId: wId } } } } }),
      ])
    : [0, 0, 0, 0];

  const showOnboarding = boardCount < 3; // new users only

  return (
    <main className="min-h-screen bg-trello-bg px-6 py-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-xl font-bold text-trello-text mb-1">Your Boards</h1>
        <p className="text-sm text-trello-textSubtle mb-6">Loaded from PostgreSQL.</p>

        {showOnboarding && (
          <OnboardingChecklist
            hasCreatedBoard={boardCount > 0}
            hasCreatedCard={cardCount > 0}
            hasInvitedMember={memberCount > 1}
            hasUploadedFile={attachmentCount > 0}
          />
        )}

        <TemplatesRow />

        {boards.length === 0 ? (
          <EmptyState
            title="No boards yet"
            subtitle="Pick a template above to create your first board and start organising your work."
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {boards.map((b) => (
              <Link
                key={b.id}
                href={`/board/${b.id}`}
                className="group relative h-24 rounded-lg overflow-hidden shadow-card flex flex-col justify-between p-3 transition-transform hover:scale-[1.02]"
                style={{ background: b.background }}
              >
                <span className="text-sm font-semibold text-white drop-shadow line-clamp-2">{b.title}</span>
                <span className="text-[11px] text-white/80">{b._count.lists} lists</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
