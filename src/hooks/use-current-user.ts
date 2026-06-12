'use client';

import { useSession } from 'next-auth/react';

export interface CurrentUser {
  id: string | null;
  name: string;
  email: string;
  image: string | null;
  initials: string;
  isAuthenticated: boolean;
}

export function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  return parts.map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

/**
 * Single source of truth for the signed-in user across the client UI.
 * Reads the real Auth.js session (top-bar avatar, account menu, comment author,
 * etc.). Falls back gracefully to a generic identity while the session is still
 * loading or when signed out, so nothing renders a hardcoded name.
 */
export function useCurrentUser(): CurrentUser {
  const { data: session, status } = useSession();
  const u = session?.user;
  const email = u?.email ?? '';
  const name = u?.name?.trim() || (email ? email.split('@')[0] : '') || 'User';
  return {
    id: u?.id ?? null,
    name,
    email,
    image: u?.image ?? null,
    initials: initialsFrom(name),
    isAuthenticated: status === 'authenticated',
  };
}
