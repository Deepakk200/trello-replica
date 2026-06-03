// Invitation accept page — Server Component. Next.js 16: params is a Promise.
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { acceptInvitation } from '@/features/workspaces/actions';

interface Props {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/sign-in?callbackUrl=/invite/${token}`);
  }

  const result = await acceptInvitation(token);

  return (
    <main className="min-h-screen flex items-center justify-center bg-trello-bg px-4">
      <div className="w-full max-w-sm bg-trello-surfaceRaised border border-trello-border rounded-xl p-6 shadow-2xl text-center">
        {result.ok ? (
          <>
            <h1 className="text-lg font-bold text-trello-text mb-2">You&apos;re in! 🎉</h1>
            <p className="text-sm text-trello-textSubtle mb-4">You&apos;ve joined the workspace.</p>
            <Link href="/" className="btn-primary inline-block px-4 py-2 text-sm font-medium">Go to boards</Link>
          </>
        ) : (
          <>
            <h1 className="text-lg font-bold text-trello-text mb-2">Invitation problem</h1>
            <p className="text-sm text-trello-danger mb-4">{result.error}</p>
            <Link href="/" className="text-trello-accent hover:underline text-sm">Back to app</Link>
          </>
        )}
      </div>
    </main>
  );
}
