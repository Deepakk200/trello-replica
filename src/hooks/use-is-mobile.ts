'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * Reactive `(max-width: <maxWidth>px)` media-query match.
 *
 * Uses useSyncExternalStore so it is SSR-safe (server snapshot = false, matching
 * the desktop-first first paint) and avoids set-state-in-effect. The default
 * 767px breakpoint mirrors Tailwind's `md`.
 */
export function useIsMobile(maxWidth = 767): boolean {
  const query = `(max-width: ${maxWidth}px)`;

  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === 'undefined') return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    [query],
  );

  const getSnapshot = useCallback(
    () => (typeof window === 'undefined' ? false : window.matchMedia(query).matches),
    [query],
  );

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
