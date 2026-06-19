'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useBoardStore } from '@/store/use-board-store';
import { boardPath } from '@/lib/slug';

/**
 * Store → URL half of the board-routing sync (mounted inside <AppShell/>, so it
 * only runs on the board shell, `/b/*`).
 *
 * Whenever the active board (or its title) changes — including via secondary
 * switchers like the command palette that only call setActiveBoard — this
 * rewrites the URL to the canonical `/b/<id>/<slug>` with router.replace (no new
 * history entry). It also self-corrects a stale slug after a board is renamed.
 *
 * Loop-safe: only replaces when the path actually differs from canonical, so once
 * URL and store agree the effect is a no-op. Mirrors <PanelUrlSync/>.
 */
export function BoardUrlSync() {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useBoardStore((s) => s._hasHydrated);
  const activeBoardId = useBoardStore((s) => s.activeBoardId);
  const title = useBoardStore((s) =>
    s.activeBoardId ? s.boards[s.activeBoardId]?.title : undefined,
  );

  useEffect(() => {
    if (!hydrated) return;
    if (!pathname || !pathname.startsWith('/b/')) return; // only within the board shell
    if (!activeBoardId || title === undefined) return;
    const canonical = boardPath(activeBoardId, title);
    if (pathname !== canonical) router.replace(canonical);
  }, [hydrated, pathname, activeBoardId, title, router]);

  return null;
}
