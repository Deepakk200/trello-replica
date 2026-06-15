'use client';

import Link from 'next/link';
import { Activity, Columns3, CreditCard, LayoutTemplate, Plus, Settings, Users } from 'lucide-react';
import { ChevronUp } from 'lucide-react';

type IconType = typeof Columns3;

function SidebarItem({
  icon: Icon,
  label,
  active,
  href,
}: {
  icon: IconType;
  label: string;
  active?: boolean;
  href?: string;
}) {
  const cls = `flex items-center gap-3 w-full px-2 py-1.5 rounded text-sm transition-colors ${
    active
      ? 'bg-[#1C3D5A] text-[#579DFF] font-medium'
      : 'text-white/80 hover:bg-white/[0.06]'
  }`;
  const inner = (
    <>
      <Icon size={16} className="flex-shrink-0" />
      <span className="truncate">{label}</span>
    </>
  );
  return href
    ? <Link href={href} className={cls}>{inner}</Link>
    : <button className={cls}>{inner}</button>;
}

function SidebarSubItem({
  icon: Icon,
  label,
  active,
  trailing,
}: {
  icon: IconType;
  label: string;
  active?: boolean;
  trailing?: React.ReactNode;
}) {
  return (
    <button
      className={`flex items-center gap-3 w-full px-2 py-1.5 rounded text-sm transition-colors ${
        active
          ? 'bg-[#1C3D5A] text-[#579DFF] font-medium'
          : 'text-white/80 hover:bg-white/[0.06]'
      }`}
    >
      <Icon size={15} className="flex-shrink-0" />
      <span className="flex-1 truncate text-left">{label}</span>
      {trailing && <span className="text-white/50 flex-shrink-0">{trailing}</span>}
    </button>
  );
}

export function WorkspaceSidebar() {
  return (
    <aside className="hidden md:flex w-64 flex-shrink-0 flex-col px-3 py-4 border-r border-white/[0.08] overflow-y-auto">
      {/* Top nav group */}
      <nav className="flex flex-col gap-0.5 mb-4">
        <SidebarItem icon={Columns3} label="Boards" active />
        <SidebarItem icon={LayoutTemplate} label="Templates" href="/templates" />
        <SidebarItem icon={Activity} label="Home" />
      </nav>

      <div className="border-t border-white/[0.08] my-3" />

      {/* Workspaces */}
      <p className="text-xs font-semibold text-white/40 uppercase tracking-wider px-2 mb-2">
        Workspaces
      </p>
      <div>
        {/* Workspace row with collapse chevron */}
        <button className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-white/5">
          <div
            className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#22A06B,#1A7A4F)' }}
          >
            T
          </div>
          <span className="text-sm text-white flex-1 text-left truncate">Trello Workspace</span>
          <ChevronUp size={14} className="text-white/50 flex-shrink-0" />
        </button>

        {/* Sub-items */}
        <div className="ml-2 mt-0.5 flex flex-col gap-0.5">
          <SidebarSubItem icon={Columns3} label="Boards" active />
          <SidebarSubItem icon={Users} label="Members" trailing={<Plus size={13} />} />
          <SidebarSubItem icon={Settings} label="Settings" />
          <SidebarSubItem icon={CreditCard} label="Billing" />
        </div>
      </div>
    </aside>
  );
}
