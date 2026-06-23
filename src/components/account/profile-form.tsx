'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { UploadButton } from '@/lib/uploadthing';
import { updateMyProfile } from '@/features/account/actions';
import { notify } from '@/store/use-toast-store';

interface Props {
  initialName: string;
  email: string;
  avatarUrl: string | null;
}

export function ProfileForm({ initialName, email, avatarUrl }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [pending, startTransition] = useTransition();

  const initials = (name || email || 'U').trim().slice(0, 2).toUpperCase();
  const dirty = name.trim() !== initialName && name.trim().length > 0;

  function save() {
    startTransition(async () => {
      try {
        await updateMyProfile({ name: name.trim() });
        notify.success('Profile updated');
        router.refresh();
      } catch (e) {
        notify.error(e instanceof Error ? e.message : 'Could not update profile');
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-white text-lg font-bold bg-cover bg-center shrink-0"
          style={avatarUrl ? { backgroundImage: `url(${avatarUrl})` } : { background: '#00B8D9' }}
        >
          {avatarUrl ? '' : initials}
        </div>
        <div>
          <p className="text-sm text-white/80 mb-1.5">Profile photo</p>
          <UploadButton
            endpoint="userAvatar"
            onClientUploadComplete={() => { notify.success('Photo updated'); router.refresh(); }}
            onUploadError={(e) => { notify.error(e.message || 'Upload failed'); }}
            appearance={{
              button: 'bg-[#0C66E4] text-white text-xs px-3 h-8 rounded ut-uploading:opacity-60',
              allowedContent: 'text-white/40 text-[11px]',
            }}
          />
        </div>
      </div>

      {/* Name */}
      <div className="flex flex-col gap-1.5 max-w-sm">
        <label htmlFor="acct-name" className="text-sm text-white/80">Full name</label>
        <input
          id="acct-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          className="bg-white/[0.06] border border-white/15 focus:border-[#579DFF] rounded px-3 py-2 text-sm text-white outline-none transition-colors"
        />
      </div>

      {/* Email (read-only — managed by the auth provider) */}
      <div className="flex flex-col gap-1.5 max-w-sm">
        <label className="text-sm text-white/80">Email</label>
        <input
          value={email}
          readOnly
          className="bg-white/[0.03] border border-white/10 rounded px-3 py-2 text-sm text-white/50 outline-none cursor-not-allowed"
        />
        <p className="text-[11px] text-white/40">Your email is managed by your sign-in provider.</p>
      </div>

      <div>
        <button
          onClick={save}
          disabled={!dirty || pending}
          className="bg-[#0C66E4] text-white text-sm font-medium px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 transition"
        >
          {pending ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}
