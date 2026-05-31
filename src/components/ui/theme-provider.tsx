'use client';

import { useEffect } from 'react';
import { useThemeStore } from '@/store/use-theme-store';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  useEffect(() => {
    // Honor system preference on first visit (before any stored preference exists)
    const stored = localStorage.getItem('trello-theme');
    if (!stored && window.matchMedia('(prefers-color-scheme: light)').matches) {
      setTheme('light');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  return <>{children}</>;
}
