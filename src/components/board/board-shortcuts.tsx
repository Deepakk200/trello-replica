'use client';

import { useEffect } from 'react';
import { boardStore } from '@/store/use-board-store';

/**
 * Board-level keyboard shortcuts (no UI). The shortcuts *help* modal lives in the
 * top bar (KeyboardShortcutsModal, toggled with `?`) — this only wires keys to real
 * actions, so there is a single source of truth for `?`. Disabled while typing.
 *
 *   B → toggle sidebar          F → open the filter popover
 *   W → open the board menu     N → add a card to the focused list (else the first)
 *   Esc → clear the card multi-selection (when no card modal is open)
 *
 * B/F/W/N reuse the existing "click the real trigger" pattern (F already did this),
 * so each shortcut drives the exact same control the mouse would.
 */
export function BoardShortcuts() {
  useEffect(() => {
    function clickTrigger(selector: string) {
      const el = document.querySelector(selector);
      if (el instanceof HTMLElement) el.click();
    }

    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
      if (typing) return; // let inputs own their keys (Esc closes composers, etc.)

      if (e.key === 'Escape') {
        const s = boardStore.getState();
        if (!s.activeCardModalId && s.selectedCardIds.length) s.clearCardSelection();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case 'b': case 'B':
          e.preventDefault(); boardStore.getState().toggleSidebar(); break;
        case 'f': case 'F':
          e.preventDefault(); clickTrigger('#filter-trigger'); break;
        case 'w': case 'W':
          e.preventDefault(); clickTrigger('#board-menu-trigger'); break;
        case 'n': case 'N': {
          e.preventDefault();
          const listId = (document.activeElement as HTMLElement | null)?.getAttribute('data-list-id');
          clickTrigger(listId ? `[data-add-card="${listId}"]` : '[data-add-card]');
          break;
        }
      }
    }

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return null;
}
