'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { boardStore, useHasHydrated } from '@/store/use-board-store';
import { boardPath } from '@/lib/slug';

// Back-compat entry point. Older links/bookmarks and the template/create flows
// land on `/b`; once the store hydrates we replace (no extra history entry) with
// the active board's canonical `/b/<id>/<slug>`, or the boards home if there are
// none. New navigation pushes the canonical URL directly.
export default function BoardIndexRedirect() {
  const router = useRouter();
  const hydrated = useHasHydrated();

  useEffect(() => {
    if (!hydrated) return;
    const s = boardStore.getState();
    const id = s.activeBoardId ?? Object.keys(s.boards)[0] ?? null;
    const board = id ? s.boards[id] : null;
    router.replace(board ? boardPath(board.id, board.title) : '/');
  }, [hydrated, router]);

  return <div className="h-screen w-full" style={{ background: '#1D2125' }} aria-hidden />;
}
