// Sign-in page — Server Component. Next.js 16: searchParams is a Promise.
import { SignInForm } from './sign-in-form';

interface Props {
  searchParams: Promise<{ error?: string; callbackUrl?: string; message?: string }>;
}

export default async function SignInPage({ searchParams }: Props) {
  const sp = await searchParams;
  return (
    <main className="min-h-screen flex items-center justify-center bg-trello-bg px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-trello-text tracking-tight">Trello Clone</h1>
          <p className="text-sm text-trello-textSubtle mt-1">Sign in to your account</p>
        </div>
        <div className="bg-trello-surfaceRaised border border-trello-border rounded-xl p-6 shadow-2xl">
          <SignInForm error={sp.error} callbackUrl={sp.callbackUrl ?? '/'} message={sp.message} />
        </div>
      </div>
    </main>
  );
}
