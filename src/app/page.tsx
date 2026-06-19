'use client';

import { TopBar } from '@/components/ui/top-bar';
import { WorkspaceSidebar } from '@/components/workspace/workspace-sidebar';
import { WorkspaceHome } from '@/components/workspace/workspace-home';
import { ErrorBoundary } from '@/components/ui/error-boundary';

export default function Home() {
  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#1D2125' }}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-200 focus:bg-trello-primary focus:text-trello-textOnBold focus:px-4 focus:py-2 focus:rounded focus:text-sm focus:font-medium focus:shadow-lg"
      >
        Skip to main content
      </a>
      <TopBar />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <WorkspaceSidebar />
        <main id="main-content" className="flex-1 min-w-0 overflow-y-auto">
          <ErrorBoundary>
            <WorkspaceHome />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
