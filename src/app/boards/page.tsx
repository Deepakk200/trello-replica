// DB-backed board grid (Phase 1, incremental).
// Server Component — fetches boards from PostgreSQL. Lives alongside the
// existing localStorage app at "/"; the two are migrated together in later batches.

import Link from "next/link";
import { getBoards } from "@/features/boards/actions";
import { TemplatesRow } from "@/components/db-board/templates-row";

export const dynamic = "force-dynamic";

export default async function BoardsPage() {
  const boards = await getBoards();

  return (
    <main className="min-h-screen bg-trello-bg px-6 py-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-xl font-bold text-trello-text mb-1">Your Boards</h1>
        <p className="text-sm text-trello-textSubtle mb-6">Loaded from PostgreSQL.</p>

        <TemplatesRow />

        {boards.length === 0 ? (
          <p className="text-sm text-trello-textSubtle">
            No boards yet. Run <code className="text-trello-text">npm run db:seed</code> to load demo data.
          </p>
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
