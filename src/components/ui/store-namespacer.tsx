'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { boardStore } from '@/store/use-board-store';

const BASE_KEY = 'trello-clone-v1';

type PersistApi = {
  setOptions: (o: { name: string }) => void;
  rehydrate: () => Promise<void> | void;
};

/**
 * Scopes the localStorage-backed board store per signed-in user, so different
 * logins never see each other's local board data. The store boots from the base
 * key (`trello-clone-v1`); once the session resolves we point persistence at
 * `trello-clone-v1:<userId>` and rehydrate (the store auto-seeds a fresh board
 * for a brand-new namespace). Identity itself lives in the DB — this only
 * partitions the local UI/board cache.
 */
export function StoreNamespacer() {
  const { data: session, status } = useSession();
  const applied = useRef<string | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    const userId = session?.user?.id ?? null;
    const key = userId ? `${BASE_KEY}:${userId}` : BASE_KEY;
    if (applied.current === key) return;
    applied.current = key;

    const persist = boardStore.persist as unknown as PersistApi;
    persist.setOptions({ name: key });
    void persist.rehydrate();
  }, [session?.user?.id, status]);

  return null;
}
