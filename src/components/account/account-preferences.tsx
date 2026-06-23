'use client';

import { signOut } from 'next-auth/react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useThemeStore, type Theme } from '@/store/use-theme-store';
import { useBoardStore } from '@/store/use-board-store';

const THEMES: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'Match browser', Icon: Monitor },
];

export function AccountPreferences() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const labsEnabled = useBoardStore((s) => s.labsEnabled);
  const setLabsEnabled = useBoardStore((s) => s.setLabsEnabled);

  return (
    <div className="flex flex-col gap-8 max-w-md">
      {/* Theme */}
      <section>
        <h2 className="text-sm font-semibold text-white mb-3">Theme</h2>
        <div className="flex flex-col gap-2">
          {THEMES.map(({ value, label, Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              aria-pressed={theme === value}
              className={`flex items-center gap-3 px-3 py-2 rounded border text-sm text-left transition-colors ${
                theme === value ? 'border-[#579DFF] bg-[#579DFF]/10 text-white' : 'border-white/10 text-white/70 hover:bg-white/5'
              }`}
            >
              <Icon size={16} />
              <span className="flex-1">{label}</span>
              {theme === value && <span className="text-[#579DFF] text-xs font-medium">Active</span>}
            </button>
          ))}
        </div>
      </section>

      {/* Labs */}
      <section>
        <h2 className="text-sm font-semibold text-white mb-1">Labs</h2>
        <p className="text-xs text-white/50 mb-3">Enable experimental features before they ship widely.</p>
        <button
          onClick={() => setLabsEnabled(!labsEnabled)}
          role="switch"
          aria-checked={labsEnabled}
          className="flex items-center gap-3 text-sm text-white/80"
        >
          <span className={`w-9 h-5 rounded-full p-0.5 transition-colors ${labsEnabled ? 'bg-[#0C66E4]' : 'bg-white/20'}`}>
            <span className={`block w-4 h-4 rounded-full bg-white transition-transform ${labsEnabled ? 'translate-x-4' : ''}`} />
          </span>
          {labsEnabled ? 'Labs enabled' : 'Labs disabled'}
        </button>
      </section>

      {/* Session */}
      <section>
        <h2 className="text-sm font-semibold text-white mb-3">Session</h2>
        <button
          onClick={() => void signOut({ callbackUrl: '/sign-in' })}
          className="text-sm font-medium text-red-300 border border-red-400/30 hover:bg-red-500/10 px-4 py-2 rounded transition-colors"
        >
          Log out
        </button>
      </section>
    </div>
  );
}
