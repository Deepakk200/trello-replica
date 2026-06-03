'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signUpUser } from '@/features/auth/actions';

const inputCls =
  'w-full bg-trello-cardBg border border-trello-borderSubtle focus:border-trello-accent rounded px-3 py-2 text-sm text-trello-text outline-none transition-colors placeholder:text-trello-textSubtle';

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e.name = 'Name must be at least 2 characters.';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) e.email = 'Enter a valid email.';
    if (password.length < 8) e.password = 'Password must be at least 8 characters.';
    if (password !== confirm) e.confirm = 'Passwords do not match.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await signUpUser({ name, email, password });
      if (!res.ok) {
        setErrors({ email: res.error ?? 'Sign-up failed.' });
        setLoading(false);
        return;
      }
      router.push('/sign-in?message=account-created');
    } catch {
      setErrors({ form: 'Something went wrong. Please try again.' });
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-trello-bg px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-trello-text tracking-tight">Trello Clone</h1>
          <p className="text-sm text-trello-textSubtle mt-1">Create your account</p>
        </div>
        <div className="bg-trello-surfaceRaised border border-trello-border rounded-xl p-6 shadow-2xl">
          {errors.form && (
            <p className="text-sm text-trello-danger bg-red-500/10 rounded px-3 py-2 mb-3">{errors.form}</p>
          )}
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <div>
              <input placeholder="Full name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
              {errors.name && <p className="text-xs text-trello-danger mt-1">{errors.name}</p>}
            </div>
            <div>
              <input type="email" placeholder="Email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
              {errors.email && <p className="text-xs text-trello-danger mt-1">{errors.email}</p>}
            </div>
            <div>
              <input type="password" placeholder="Password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} />
              {errors.password && <p className="text-xs text-trello-danger mt-1">{errors.password}</p>}
            </div>
            <div>
              <input type="password" placeholder="Confirm password" className={inputCls} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              {errors.confirm && <p className="text-xs text-trello-danger mt-1">{errors.confirm}</p>}
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-2 text-sm font-medium disabled:opacity-50">
              {loading ? 'Creating account…' : 'Sign up'}
            </button>
          </form>
          <p className="text-sm text-trello-textSubtle text-center mt-3">
            Already have an account?{' '}
            <Link href="/sign-in" className="text-trello-accent hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
