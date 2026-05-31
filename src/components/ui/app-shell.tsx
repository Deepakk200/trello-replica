'use client';

import { TopBar } from './top-bar';
import { Sidebar } from './sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopBar />
      <div className="flex h-[calc(100vh-40px)]">
        <Sidebar />
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </>
  );
}
