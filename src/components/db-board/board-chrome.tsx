'use client';

// Global chrome for the DB board route (A1 top bar + A5 bottom nav), matching
// the Inbox/Boards pages. DB-appropriate: search/switch open the command
// palette; Inbox/Planner cross to the /b shell (where those panels live) with
// the right panel pre-opened; Board is the active tab here.

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search, Megaphone, HelpCircle, Inbox, CalendarDays, LayoutDashboard, ArrowLeftRight,
} from 'lucide-react';
import { NotificationBell } from '@/components/ui/notification-bell';
import { openCommandPalette } from '@/components/ui/command-palette';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useBoardStore } from '@/store/use-board-store';
import { CreateBoardDialog } from './create-board-dialog';
import { AccountMenu } from '@/components/ui/account-menu';

export function DbTopBar() {
  const user = useCurrentUser();
  const [create, setCreate] = useState(false);
  const [menu, setMenu] = useState(false);
  return (
    <header className="h-11 flex items-center gap-2 px-3 border-b border-white/[0.08] shrink-0 relative z-30" style={{ background: '#1D2125' }}>
      {/* 9-dot apps grid */}
      <button onClick={() => openCommandPalette()} className="p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white" aria-label="Apps" title="Apps">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <rect x="0" y="0" width="4" height="4" rx="0.5" /><rect x="6" y="0" width="4" height="4" rx="0.5" /><rect x="12" y="0" width="4" height="4" rx="0.5" />
          <rect x="0" y="6" width="4" height="4" rx="0.5" /><rect x="6" y="6" width="4" height="4" rx="0.5" /><rect x="12" y="6" width="4" height="4" rx="0.5" />
          <rect x="0" y="12" width="4" height="4" rx="0.5" /><rect x="6" y="12" width="4" height="4" rx="0.5" /><rect x="12" y="12" width="4" height="4" rx="0.5" />
        </svg>
      </button>
      <Link href="/boards" className="flex items-center gap-1.5 flex-shrink-0 rounded px-1.5 py-1 hover:bg-white/5 transition-colors">
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
          className="flex items-center gap-2 w-[440px] max-w-[46vw] rounded-full px-3 h-8 text-left"
          style={{ background: 'rgba(255,255,255,0.12)' }}
          aria-label="Search"
        >
          <Search size={14} className="text-white/50 flex-shrink-0" />
          <span className="flex-1 text-sm text-white/50 truncate">Search</span>
        </button>
        <button onClick={() => setCreate(true)} className="h-8 px-3 text-sm font-medium text-white rounded-sm flex-shrink-0" style={{ background: '#0052CC' }}>
          Create
        </button>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <button className="hidden sm:block p-1.5 rounded hover:bg-white/10 text-white/80 hover:text-white" aria-label="Announcements" title="What's new">
          <Megaphone size={18} />
        </button>
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
      </div>
      {create && <CreateBoardDialog onClose={() => setCreate(false)} />}
      {menu && <AccountMenu onClose={() => setMenu(false)} onOpenShortcuts={() => {}} onOpenHelp={() => {}} onCreateWorkspace={() => {}} />}
    </header>
  );
}

export function DbBottomNav() {
  const router = useRouter();
  const setInboxOpen = useBoardStore((s) => s.setInboxOpen);
  const setPlannerOpen = useBoardStore((s) => s.setPlannerOpen);

  const tabs = [
    { id: 'inbox', label: 'Inbox', Icon: Inbox, active: false, onClick: () => { setInboxOpen(true); setPlannerOpen(false); router.push('/b'); } },
    { id: 'planner', label: 'Planner', Icon: CalendarDays, active: false, onClick: () => { setPlannerOpen(true); setInboxOpen(false); router.push('/b'); } },
    { id: 'board', label: 'Board', Icon: LayoutDashboard, active: true, onClick: () => {} },
    { id: 'switch', label: 'Switch boards', Icon: ArrowLeftRight, active: false, onClick: () => openCommandPalette() },
  ];

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none max-sm:left-2 max-sm:right-2 max-sm:translate-x-0">
      <nav
        aria-label="App navigation"
        className="pointer-events-auto flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-xl shadow-2xl border border-white/15 backdrop-blur-md max-sm:w-full"
        style={{ background: 'rgba(29,33,37,0.9)' }}
      >
        {tabs.map(({ id, label, Icon, active, onClick }) => (
          <button
            key={id}
            onClick={onClick}
            aria-current={active ? 'page' : undefined}
            style={{ touchAction: 'manipulation' }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#579DFF] ${
              active ? 'bg-[#579DFF]/15 text-[#579DFF]' : id === 'switch' ? 'text-white/70 hover:text-white hover:bg-white/10 ring-1 ring-[#579DFF]/40' : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            <Icon size={16} className="flex-shrink-0" />
            <span className={`${active ? 'border-b-2 border-[#579DFF] pb-0.5' : ''} ${id === 'switch' ? 'max-sm:hidden' : ''}`}>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
