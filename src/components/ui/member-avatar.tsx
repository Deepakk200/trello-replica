'use client';

import { useBoardStore } from '@/store/use-board-store';
import type { ID } from '@/types';

const SIZE: Record<string, string> = {
  xs: 'h-5 w-5 text-[10px]',
  sm: 'h-7 w-7 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-12 w-12 text-base',
};

interface Props { memberId: ID; size?: 'xs' | 'sm' | 'md' | 'lg'; className?: string }

export function MemberAvatar({ memberId, size = 'sm', className }: Props) {
  const member = useBoardStore((s) => s.members[memberId]);
  if (!member) return null;
  return (
    <div
      title={member.name}
      className={`${SIZE[size]} rounded-full font-bold text-white flex items-center justify-center shrink-0 select-none ${className ?? ''}`}
      style={{ background: member.color }}
    >
      {member.initials}
    </div>
  );
}
