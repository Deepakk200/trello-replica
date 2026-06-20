'use client';

// DEV-ONLY virtualization benchmark harness (404s in production). Seeds a single
// list with ?n cards directly into the store and renders the real ListColumn
// inside the real BoardDndContext, so a Playwright browser run can measure the
// actual DOM node count vs. card count and exercise drag. Public via proxy.ts.
import { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import { boardStore } from '@/store/use-board-store';
import { BoardDndContext } from '@/components/board/dnd-context';
import { ListColumn } from '@/components/list/list-column';
import type { Card, List, Board } from '@/types';

export default function VirtualBench() {
  const [ids, setIds] = useState<{ boardId: string; listId: string } | null>(null);

  useEffect(() => {
    const n = Math.max(1, Number(new URLSearchParams(window.location.search).get('n') ?? '1000'));
    const boardId = 'bench-board';
    const listId = 'bench-list';
    const ts = new Date().toISOString();
    const cards: Record<string, Card> = {};
    const cardIds: string[] = [];
    for (let i = 0; i < n; i++) {
      const id = `c${i}`;
      cardIds.push(id);
      cards[id] = {
        id, listId, title: `Card ${i + 1}`, description: '', number: i + 1,
        memberIds: [], attachments: [], labelIds: [], dueDate: null, completed: false,
        isArchived: false, linkedCardIds: [], cover: { type: 'none', size: 'half' },
        checklists: [], activity: [], createdAt: ts, updatedAt: ts,
      };
    }
    const list: List = { id: listId, boardId, title: `Bench (${n})`, cardIds, order: 0, isArchived: false };
    const board: Board = {
      id: boardId, title: 'Bench', background: '#1D2125', description: '', listIds: [listId],
      createdAt: ts, memberIds: [], nextCardNumber: n + 1, workspaceId: '', visibility: 'workspace',
    };
    // Replace the store data with just the bench list.
    boardStore.setState((s) => {
      s.boards = { [boardId]: board };
      s.lists = { [listId]: list };
      s.cards = cards;
      s.activeBoardId = boardId;
      s._hasHydrated = true;
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time bench seed on mount
    setIds({ boardId, listId });
  }, []);

  if (process.env.NODE_ENV === 'production') notFound();
  if (!ids) return <div style={{ color: '#fff', padding: 16 }}>seeding…</div>;

  return (
    <div style={{ height: '100vh', background: '#1D2125', padding: 16 }} data-bench-ready="true">
      <BoardDndContext>
        <div style={{ width: 300, height: '100%' }}>
          <ListColumn boardId={ids.boardId} listId={ids.listId} />
        </div>
      </BoardDndContext>
    </div>
  );
}
