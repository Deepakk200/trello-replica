'use client';

import { AppShell } from '@/components/ui/app-shell';
import { BoardView } from '@/components/board/board-view';
import { ErrorBoundary } from '@/components/ui/error-boundary';

export default function BoardPage() {
  return (
    <AppShell>
      <ErrorBoundary>
        <BoardView />
      </ErrorBoundary>
    </AppShell>
  );
}
