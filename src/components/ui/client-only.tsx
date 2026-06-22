'use client';

import { useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';

const subscribe = () => () => {};

/**
 * Renders `children` only on the client (after hydration); renders `fallback` on
 * the server and during hydration so the server HTML and the first client render
 * always match. This eliminates hydration mismatches — including the benign ones
 * caused by browser extensions that inject attributes (e.g. `fdprocessedid`) onto
 * form controls before React hydrates.
 *
 * Uses `useSyncExternalStore` (not a mount effect) so the server/hydration pass is
 * consistent and there's no extra render flash or `set-state-in-effect`.
 *
 * Appropriate ONLY for surfaces that gain nothing from SSR — e.g. the legacy
 * localStorage board app, whose data isn't available on the server anyway and
 * which already shows a hydration skeleton.
 */
export function ClientOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const isServer = useSyncExternalStore(subscribe, () => false, () => true);
  return <>{isServer ? fallback : children}</>;
}
