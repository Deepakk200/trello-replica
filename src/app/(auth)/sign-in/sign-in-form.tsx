'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const inputCls =
  'w-full bg-trello-cardBg border border-trello-borderSubtle focus:border-trello-accent rounded px-3 py-2 text-sm text-trello-text outline-none transition-colors placeholder:text-trello-textSubtle';

export function SignInForm({
  error: initialError,
  callbackUrl,
  message,
}: {
  error?: string;
  callbackUrl: string;
  message?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(initialError ? 'Sign-in failed. Please try again.' : '');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await signIn('credentials', { email, password, redirect: false });
    setLoading(false);
    if (res?.error) setError('Invalid email or password.');
    else router.push(callbackUrl || '/');
  }

  return (
    <div className="flex flex-col gap-3">
      {message === 'account-created' && (
        <p className="text-sm text-emerald-400 bg-emerald-500/10 rounded px-3 py-2">
          Account created — sign in to continue.
        </p>
      )}
      {error && (
        <p className="text-sm text-trello-danger bg-red-500/10 rounded px-3 py-2">{error}</p>
      )}

      <button
        type="button"
        onClick={() => signIn('google', { callbackUrl: callbackUrl || '/' })}
        className="w-full flex items-center justify-center gap-2 bg-white text-slate-800 font-medium rounded px-3 py-2 text-sm hover:bg-slate-100 transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
        </svg>
        Continue with Google
      </button>

      <div className="flex items-center gap-3 my-1">
        <div className="h-px flex-1 bg-trello-border" />
        <span className="text-xs text-trello-textSubtle">or</span>
        <div className="h-px flex-1 bg-trello-border" />
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          required
          autoFocus
          placeholder="Email"
          className={inputCls}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          required
          placeholder="Password"
          className={inputCls}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-2 text-sm font-medium disabled:opacity-50"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="text-sm text-trello-textSubtle text-center">
        Don&apos;t have an account?{' '}
        <Link href="/sign-up" className="text-trello-accent hover:underline">Sign up</Link>
      </p>
    </div>
  );
}
