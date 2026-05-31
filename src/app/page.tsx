'use client';

import { AppShell } from '@/components/ui/app-shell';
import { BoardView } from '@/components/board/board-view';

export default function Home() {
  return (
    <AppShell>
      <BoardView />
    </AppShell>
  );
}
