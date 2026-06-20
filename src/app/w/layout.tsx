// Workspace sub-pages (Members / Settings / Billing) share the same chrome as
// the workspace home at "/": the global TopBar + WorkspaceSidebar. The pages
// themselves are now DB-backed (real workspace/members/roles via authz); only the
// sidebar header still shows the device-local workspace label.
import { TopBar } from '@/components/ui/top-bar';
import { WorkspaceSidebar } from '@/components/workspace/workspace-sidebar';

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#1D2125' }}>
      <TopBar />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <WorkspaceSidebar />
        <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
