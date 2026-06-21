'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, ChevronUp, Columns3, CreditCard, LayoutTemplate, Plus, Settings, Users } from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { useBoardStore } from '@/store/use-board-store';

type IconType = typeof Columns3;

function NavRow({ icon: Icon, label, href, active, trailing, size = 16, sub = false }: {
  icon: IconType; label: string; href: string; active: boolean;
  trailing?: React.ReactNode; size?: number; sub?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 w-full px-2 py-1.5 rounded text-sm transition-colors ${
        active ? 'bg-[#1C3D5A] text-[#579DFF] font-medium' : 'text-white/80 hover:bg-white/[0.06]'
      } ${sub ? 'gap-3' : ''}`}
    >
      <Icon size={size} className="flex-shrink-0" />
      <span className="flex-1 truncate text-left">{label}</span>
      {trailing && <span className="text-white/50 flex-shrink-0">{trailing}</span>}
    </Link>
  );
}

export function WorkspaceSidebar() {
  const pathname = usePathname();
  const { workspaceName, workspaceAvatarColor } = useBoardStore(
    useShallow((s) => ({ workspaceName: s.workspaceName, workspaceAvatarColor: s.workspaceAvatarColor })),
  );

  // "Boards" is the workspace home ("/") and the board view ("/b").
  const onBoards = pathname === '/' || pathname.startsWith('/b');

  return (
    <aside className="hidden md:flex w-64 flex-shrink-0 flex-col px-3 py-4 border-r border-white/[0.08] overflow-y-auto">
      {/* Top nav group */}
      <nav className="flex flex-col gap-0.5 mb-4">
        <NavRow icon={Columns3} label="Boards" href="/" active={onBoards} />
        <NavRow icon={LayoutTemplate} label="Templates" href="/templates" active={pathname.startsWith('/templates')} />
        <NavRow icon={Activity} label="Home" href="/" active={false} />
      </nav>

      <div className="border-t border-white/[0.08] my-3" />

      {/* Workspaces */}
      <p className="text-xs font-semibold text-white/40 uppercase tracking-wider px-2 mb-2">Workspaces</p>
      <div>
        {/* Workspace row — reflects live name + color from the store */}
        <button className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-white/5">
          <div
            className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: workspaceAvatarColor }}
          >
            {(workspaceName[0] ?? 'T').toUpperCase()}
          </div>
          <span className="text-sm text-white flex-1 text-left truncate">{workspaceName}</span>
          <ChevronUp size={14} className="text-white/50 flex-shrink-0" />
        </button>

        {/* Sub-items */}
        <div className="ml-2 mt-0.5 flex flex-col gap-0.5">
          <NavRow icon={Columns3} label="Boards" href="/" active={onBoards} size={15} sub />
          <NavRow icon={Users} label="Members" href="/w/members" active={pathname === '/w/members'} trailing={<Plus size={13} />} size={15} sub />
          <NavRow icon={Settings} label="Settings" href="/settings" active={pathname === '/settings'} size={15} sub />
          <NavRow icon={CreditCard} label="Billing" href="/w/billing" active={pathname === '/w/billing'} size={15} sub />
        </div>
      </div>
    </aside>
  );
}
