import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { TopBar } from '@/components/ui/top-bar';

const TITLES: Record<string, { title: string; blurb: string }> = {
  profile: { title: 'Profile and visibility', blurb: 'Manage your personal information and who can see it.' },
  activity: { title: 'Activity', blurb: 'A history of your recent actions across boards.' },
  cards: { title: 'Cards', blurb: 'Every card assigned to you, in one place.' },
  settings: { title: 'Settings', blurb: 'Account preferences and notification settings.' },
};

export default async function AccountSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const meta = TITLES[section] ?? { title: 'Account', blurb: 'Account settings.' };

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#1D2125' }}>
      <TopBar />
      <main className="flex-1 overflow-y-auto px-6 py-10">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft size={15} /> Back to workspace
          </Link>
          <h1 className="text-2xl font-bold text-white mb-2">{meta.title}</h1>
          <p className="text-sm text-white/60 mb-8">{meta.blurb}</p>
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-10 text-center">
            <p className="text-sm text-white/50">
              This is a placeholder for the <span className="text-white/80 font-medium">{meta.title}</span> page.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
