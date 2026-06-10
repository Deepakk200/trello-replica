'use client';

import { useEffect } from 'react';
import { boardStore, useBoardStore } from '@/store/use-board-store';

type Panel = 'board' | 'inbox' | 'planner';
const VALID: Panel[] = ['board', 'inbox', 'planner'];

function panelFromUrl(): Panel {
  if (typeof window === 'undefined') return 'board';
  const p = new URLSearchParams(window.location.search).get('panel');
  return (VALID as string[]).includes(p ?? '') ? (p as Panel) : 'board';
}

// Keeps the active workspace panel (Inbox / Planner / Board) in sync with the URL:
//   - deep link / refresh: ?panel=planner restores that panel on load
//   - tab switch: pushes a history entry so the browser Back button works
//   - Back/Forward: popstate restores the panel from the URL
export function PanelUrlSync() {
  const activePanel = useBoardStore((s) => s.activePanel);
  const setActivePanel = useBoardStore((s) => s.setActivePanel);

  // On mount: adopt the panel encoded in the URL (URL wins over persisted state).
  useEffect(() => {
    const urlPanel = panelFromUrl();
    if (urlPanel !== boardStore.getState().activePanel) setActivePanel(urlPanel);

    function onPop() {
      const next = panelFromUrl();
      if (next !== boardStore.getState().activePanel) setActivePanel(next);
    }
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the panel changes (e.g. via the dock), reflect it in the URL with a new
  // history entry — but only if it differs from what's already there (avoids loops
  // when the change originated from a popstate).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (panelFromUrl() === activePanel) return;
    const url = new URL(window.location.href);
    if (activePanel === 'board') url.searchParams.delete('panel');
    else url.searchParams.set('panel', activePanel);
    window.history.pushState({ panel: activePanel }, '', url);
  }, [activePanel]);

  return null;
}
