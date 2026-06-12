'use client';

import { TopBar } from '@/components/ui/top-bar';
import { WorkspaceSidebar } from '@/components/workspace/workspace-sidebar';
import { WorkspaceHome } from '@/components/workspace/workspace-home';
import { ErrorBoundary } from '@/components/ui/error-boundary';

export default function Home() {
  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#1D2125' }}>
      <TopBar />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <WorkspaceSidebar />
        <main className="flex-1 min-w-0 overflow-y-auto">
          <ErrorBoundary>
            <WorkspaceHome />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
