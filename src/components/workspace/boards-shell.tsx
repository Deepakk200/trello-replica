'use client';

// Trello-style workspace-home shell for the DB /boards page: a slim top nav,
// a persistent left workspace sidebar (mobile drawer), and a wide content area.
// DB-native — does NOT reuse the legacy TopBar (whose Create makes localStorage
// boards). Search opens the global command palette; the bell is the DB bell.

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Columns3, LayoutTemplate, Activity, ChevronUp, ChevronLeft, ChevronRight,
  Users, Settings, Plus, Search, HelpCircle, Megaphone, Menu, X, Briefcase,
} from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { NotificationBell } from '@/components/ui/notification-bell';
import { openCommandPalette } from '@/components/ui/command-palette';
import { ResizeDivider } from '@/components/ui/resize-divider';
import { useBoardStore } from '@/store/use-board-store';
import { useCurrentUser } from '@/hooks/use-current-user';
import { AccountMenu } from '@/components/ui/account-menu';

// Deterministic tile tint from the workspace name (DB has no avatarColor column).
const TINTS = ['#0079BF', '#D29034', '#519839', '#B04632', '#89609E', '#CD5A91', '#4BBF6B', '#00AECC'];
function tint(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
}

function NavRow({ icon: Icon, label, href, active, trailing, sub }: {
  icon: typeof Columns3; label: string; href: string; active: boolean;
  trailing?: ReactNode; sub?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-3 w-full ${sub ? 'pl-3' : ''} px-2 py-1.5 rounded text-sm transition-colors ${
        active ? 'bg-[#1C3D5A] text-[#579DFF] font-medium' : 'text-white/80 hover:bg-white/[0.06]'
      }`}
    >
      <Icon size={sub ? 15 : 16} className="flex-shrink-0" />
      <span className="flex-1 truncate text-left">{label}</span>
      {trailing && <span className="text-white/50 flex-shrink-0">{trailing}</span>}
    </Link>
  );
}

function Sidebar({ workspaceName, role, onCollapse }: { workspaceName: string; role: string; onCollapse?: () => void }) {
  const pathname = usePathname();
  const onBoards = pathname === '/boards' || pathname.startsWith('/board');
  return (
    // Scrollable nav region + pinned footer so the Upgrade card never overlaps
    // the workspace rows when the list grows.
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {onCollapse && (
          <div className="flex items-center justify-end mb-1">
            <button
              onClick={onCollapse}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
              className="w-7 h-7 rounded flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              <ChevronLeft size={15} />
            </button>
          </div>
        )}
        <nav className="flex flex-col gap-0.5 mb-3" aria-label="Workspace">
          <NavRow icon={Columns3} label="Boards" href="/boards" active={false} />
          <NavRow icon={LayoutTemplate} label="Templates" href="/templates" active={pathname.startsWith('/templates')} />
          <NavRow icon={Activity} label="Home" href="/boards" active={false} />
        </nav>

        <div className="border-t border-white/[0.08] my-2" />

        <div className="flex items-center justify-between px-2 mb-1">
          <p className="text-xs font-semibold text-white/50 tracking-wide">Workspaces</p>
          <button aria-label="Close workspaces" className="p-0.5 rounded text-white/40 hover:text-white hover:bg-white/10 transition-colors">
            <X size={14} />
          </button>
        </div>

        <button className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-white/5">
          <span className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: tint(workspaceName) }}>
            {(workspaceName[0] ?? 'W').toUpperCase()}
          </span>
          <span className="text-sm text-white flex-1 text-left truncate">{workspaceName}</span>
          <ChevronUp size={14} className="text-white/50 flex-shrink-0" />
        </button>

        <div className="mt-0.5 flex flex-col gap-0.5">
          <NavRow icon={Columns3} label="Boards" href="/boards" active={onBoards} sub />
          <NavRow icon={Users} label="Members" href="/w/members" active={pathname === '/w/members'} trailing={<Plus size={13} />} sub />
          <NavRow icon={Settings} label="Settings" href="/settings" active={pathname === '/settings'} sub />
        </div>
      </div>

      {/* Upgrade card — pinned footer (cosmetic) */}
      <div className="shrink-0 px-3 pb-4 pt-2">
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <Briefcase size={15} className="text-[#9F8FEF]" />
            <p className="text-sm font-semibold text-white">Upgrade this Workspace</p>
          </div>
          <p className="text-xs text-white/55 leading-relaxed mb-2">
            Get unlimited boards, advanced automation, Planner (full access), collapsible lists, AI, and more!
          </p>
          <Link href="/w/billing" className="text-xs font-medium text-[#579DFF] hover:underline">Upgrade</Link>
          {role && <span className="ml-2 text-[10px] uppercase tracking-wide text-white/30">{role}</span>}
        </div>
      </div>
    </div>
  );
}

export function BoardsShell({ workspaceName, role, children }: {
  workspaceName: string; role: string; children: ReactNode;
}) {
  const [drawer, setDrawer] = useState(false);
  const [announce, setAnnounce] = useState(false);
  const [menu, setMenu] = useState(false);
  const user = useCurrentUser();

  // Resizable + collapsible workspace sidebar (persisted via the store).
  const { sidebarCollapsed, sidebarWidth } = useBoardStore(
    useShallow((s) => ({ sidebarCollapsed: s.sidebarCollapsed, sidebarWidth: s.sidebarWidth })),
  );
  const setSidebarWidth = useBoardStore((s) => s.setSidebarWidth);
  const toggleSidebar = useBoardStore((s) => s.toggleSidebar);
  const [resizing, setResizing] = useState(false);

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#1D2125' }}>
      {/* Top nav */}
      <header className="h-11 flex items-center gap-2 px-3 border-b border-white/[0.08] shrink-0 relative z-30" style={{ background: '#1D2125' }}>
        <button onClick={() => setDrawer(true)} className="md:hidden p-1.5 rounded hover:bg-white/10 text-white/80" aria-label="Open menu">
          <Menu size={18} />
        </button>
        {/* Waffle / board switcher — opens the global command palette (our switch surface) */}
        <button
          onClick={() => openCommandPalette()}
          className="hidden md:block p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white"
          aria-label="Switch boards"
          title="Switch boards"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <rect x="0" y="0" width="4" height="4" rx="0.5" /><rect x="6" y="0" width="4" height="4" rx="0.5" /><rect x="12" y="0" width="4" height="4" rx="0.5" />
            <rect x="0" y="6" width="4" height="4" rx="0.5" /><rect x="6" y="6" width="4" height="4" rx="0.5" /><rect x="12" y="6" width="4" height="4" rx="0.5" />
            <rect x="0" y="12" width="4" height="4" rx="0.5" /><rect x="6" y="12" width="4" height="4" rx="0.5" /><rect x="12" y="12" width="4" height="4" rx="0.5" />
          </svg>
        </button>
        <Link href="/boards" className="flex items-center gap-1.5 flex-shrink-0 border border-white/15 rounded px-1.5 py-1 hover:bg-white/5 transition-colors">
          <svg width="22" height="22" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <rect width="28" height="28" rx="6" fill="#0052CC" />
            <rect x="5" y="5" width="8" height="18" rx="2" fill="white" />
            <rect x="15" y="5" width="8" height="11" rx="2" fill="white" />
          </svg>
          <span className="text-white font-semibold text-base leading-none hidden sm:inline">Trello</span>
        </Link>

        <div className="flex-1 flex justify-center items-center gap-3 min-w-0 px-2">
          <button
            onClick={() => openCommandPalette()}
            className="flex items-center gap-2 w-[440px] max-w-[46vw] rounded-full px-3 h-8 text-left" style={{ background: 'rgba(255,255,255,0.12)' }}
            aria-label="Search"
          >
            <Search size={14} className="text-white/50 flex-shrink-0" />
            <span className="flex-1 text-sm text-white/50 truncate">Search</span>
          </button>
          <button onClick={() => openCommandPalette()} className="h-8 px-3 text-sm font-medium text-white rounded-sm flex-shrink-0" style={{ background: '#0052CC' }}>
            Create
          </button>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Announcements */}
          <div className="relative hidden sm:block">
            <button onClick={() => setAnnounce((v) => !v)} className="p-1.5 rounded hover:bg-white/10 text-white/80 hover:text-white" aria-label="Announcements" title="What's new">
              <Megaphone size={18} />
            </button>
            {announce && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setAnnounce(false)} aria-hidden="true" />
                <div className="anim-popover-enter origin-top-right absolute right-0 top-full mt-1 w-72 bg-[#282E33] border border-white/10 rounded-lg shadow-2xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/[0.08]">
                    <p className="text-sm font-semibold text-white">What&apos;s new</p>
                  </div>
                  <div className="p-2">
                    {[
                      { t: 'Workspace home', d: 'Your boards now live on a dedicated home page.' },
                      { t: 'Templates', d: 'Start a board from a ready-made layout.' },
                      { t: 'Calendar view', d: 'Drag cards to reschedule on the calendar.' },
                    ].map((a) => (
                      <div key={a.t} className="px-2 py-2 rounded hover:bg-white/5">
                        <p className="text-sm text-white/90 font-medium">{a.t}</p>
                        <p className="text-xs text-white/50 mt-0.5">{a.d}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <NotificationBell />
          <a href="https://support.atlassian.com/trello/" target="_blank" rel="noreferrer" className="hidden sm:block p-1.5 rounded hover:bg-white/10 text-white/80 hover:text-white" aria-label="Help">
            <HelpCircle size={18} />
          </a>
          <button
            onClick={() => setMenu(true)}
            className="ml-1 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 bg-cover bg-center"
            style={user.image ? { backgroundImage: `url(${user.image})` } : { background: '#00B8D9' }}
            aria-label="Account"
            aria-haspopup="menu"
            title={user.name}
            suppressHydrationWarning
          >
            {user.image ? '' : user.initials}
          </button>
          {menu && <AccountMenu onClose={() => setMenu(false)} onOpenShortcuts={() => {}} onOpenHelp={() => {}} onCreateWorkspace={() => {}} />}
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Desktop sidebar — drag the divider to resize; dragging below 64px auto-collapses.
            Width is animated except while actively dragging (so the drag tracks the cursor). */}
        {sidebarCollapsed ? (
          <aside
            className="hidden md:flex w-12 flex-shrink-0 flex-col items-center gap-2 border-r border-white/[0.08] py-3 transition-[width] duration-200 ease-in-out"
            aria-label="Workspace (collapsed)"
          >
            <button
              onClick={toggleSidebar}
              aria-label="Expand sidebar"
              title="Expand sidebar"
              className="w-8 h-8 rounded-md flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
            <span className="w-8 h-8 rounded-md flex items-center justify-center text-white/50" title="Boards">
              <Columns3 size={16} />
            </span>
          </aside>
        ) : (
          <>
            <aside
              className={`hidden md:flex flex-shrink-0 flex-col border-r border-white/[0.08] ${resizing ? '' : 'transition-[width] duration-200 ease-in-out'}`}
              style={{ width: sidebarWidth }}
            >
              <Sidebar workspaceName={workspaceName} role={role} onCollapse={toggleSidebar} />
            </aside>
            <div className="hidden md:block">
              <ResizeDivider
                onResizeStart={() => setResizing(true)}
                onResizeEnd={() => setResizing(false)}
                onResize={(dx) => setSidebarWidth(sidebarWidth + dx)}
              />
            </div>
          </>
        )}

        {/* Mobile drawer */}
        {drawer && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <div className="absolute inset-0 bg-black/60" onClick={() => setDrawer(false)} aria-hidden="true" />
            <aside className="relative w-64 max-w-[80vw] h-full border-r border-white/[0.08] anim-menu-enter" style={{ background: '#1D2125' }}>
              <button onClick={() => setDrawer(false)} className="absolute top-3 right-3 p-1 rounded hover:bg-white/10 text-white/70 z-10" aria-label="Close menu">
                <X size={16} />
              </button>
              <Sidebar workspaceName={workspaceName} role={role} />
            </aside>
          </div>
        )}

        <main id="main-content" className="flex-1 min-w-0 overflow-y-auto bg-trello-bg">
          {children}
        </main>
      </div>
    </div>
  );
}
