import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, Activity as ActivityIcon, CheckSquare, Clock } from 'lucide-react';
import { TopBar } from '@/components/ui/top-bar';
import { timeAgo } from '@/lib/time';
import { getMyProfile, getMyActivity, getMyAssignedCards } from '@/features/account/actions';
import { ProfileForm } from '@/components/account/profile-form';
import { AccountPreferences } from '@/components/account/account-preferences';

export const dynamic = 'force-dynamic';

const TITLES: Record<string, { title: string; blurb: string }> = {
  profile: { title: 'Profile and visibility', blurb: 'Manage your personal information and how it appears.' },
  activity: { title: 'Activity', blurb: 'A history of your recent actions across boards.' },
  cards: { title: 'Cards', blurb: 'Every card assigned to you, in one place.' },
  settings: { title: 'Settings', blurb: 'Account preferences and theme.' },
};

function describeActivity(type: string, data: unknown): string {
  const text = data && typeof data === 'object' && 'text' in data ? String((data as { text: unknown }).text ?? '') : '';
  const label = type.replace(/[._]/g, ' ');
  return text ? `${label}: ${text}` : label;
}

function EmptyState({ icon, title, hint }: { icon: ReactNode; title: string; hint: string }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-10 text-center flex flex-col items-center gap-2">
      <div className="text-white/30">{icon}</div>
      <p className="text-sm text-white/70 font-medium">{title}</p>
      <p className="text-xs text-white/40">{hint}</p>
    </div>
  );
}

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

          {section === 'profile' && <ProfileSection />}
          {section === 'activity' && <ActivitySection />}
          {section === 'cards' && <CardsSection />}
          {section === 'settings' && <AccountPreferences />}
          {!['profile', 'activity', 'cards', 'settings'].includes(section) && (
            <EmptyState icon={<ActivityIcon size={28} />} title="Nothing here" hint="This account page doesn't exist." />
          )}
        </div>
      </main>
    </div>
  );
}

async function ProfileSection() {
  const profile = await getMyProfile();
  if (!profile) {
    return <EmptyState icon={<ActivityIcon size={28} />} title="Not signed in" hint="Sign in to manage your profile." />;
  }
  return <ProfileForm initialName={profile.name ?? ''} email={profile.email} avatarUrl={profile.avatarUrl} />;
}

async function ActivitySection() {
  const activity = await getMyActivity();
  if (activity.length === 0) {
    return <EmptyState icon={<ActivityIcon size={28} />} title="No activity yet" hint="Your actions across boards will show up here." />;
  }
  return (
    <ul className="flex flex-col divide-y divide-white/[0.06] rounded-xl border border-white/[0.08] bg-white/[0.03]">
      {activity.map((a) => (
        <li key={a.id} className="flex items-start gap-3 px-4 py-3">
          <ActivityIcon size={15} className="text-white/30 mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-white/85 break-words">{describeActivity(a.type, a.data)}</p>
            <p className="text-xs text-white/40 mt-0.5">
              {a.card?.title ? `${a.card.title} · ` : ''}
              {a.board ? (
                <Link href={`/board/${a.board.id}`} className="hover:underline">{a.board.title}</Link>
              ) : 'Board'}
              {' · '}{timeAgo(a.createdAt.toISOString())}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

async function CardsSection() {
  const cards = await getMyAssignedCards();
  if (cards.length === 0) {
    return <EmptyState icon={<CheckSquare size={28} />} title="No cards assigned" hint="Cards assigned to you will appear here." />;
  }
  return (
    <ul className="flex flex-col gap-2">
      {cards.map((c) => (
        <li key={c.id}>
          <Link
            href={`/board/${c.list.board.id}?card=${c.id}`}
            className="flex items-center gap-3 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] px-4 py-3 transition-colors"
          >
            <span className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center ${c.completed ? 'bg-[#22A06B] border-[#22A06B]' : 'border-white/30'}`}>
              {c.completed && <CheckSquare size={11} className="text-white" />}
            </span>
            <span className={`flex-1 min-w-0 text-sm truncate ${c.completed ? 'text-white/40 line-through' : 'text-white/90'}`}>{c.title}</span>
            {c.dueDate && (
              <span className="flex items-center gap-1 text-xs text-white/50 shrink-0">
                <Clock size={12} />{c.dueDate.toLocaleDateString()}
              </span>
            )}
            <span className="text-xs text-white/40 shrink-0 hidden sm:inline">{c.list.board.title}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
