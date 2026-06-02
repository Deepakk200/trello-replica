import type { LabelColor } from '@/types';

/** Canonical ordering of label colours used by pickers. */
export const LABEL_COLORS: LabelColor[] = [
  'green', 'yellow', 'orange', 'red', 'purple', 'blue', 'sky', 'lime', 'pink', 'black',
];

/** Maps a label colour to its CSS custom property reference. */
export const LABEL_VAR: Record<LabelColor, string> = {
  green:  'var(--label-green)',  yellow: 'var(--label-yellow)', orange: 'var(--label-orange)',
  red:    'var(--label-red)',    purple: 'var(--label-purple)', blue:   'var(--label-blue)',
  sky:    'var(--label-sky)',    lime:   'var(--label-lime)',   pink:   'var(--label-pink)',
  black:  'var(--label-black)',
};

/** Returns the CSS variable for a label colour (falls back to black). */
export function getLabelColor(color: LabelColor): string {
  return LABEL_VAR[color] ?? LABEL_VAR.black;
}

/** Tailwind background utility classes per label colour (for chips / dots). */
export const LABEL_BG: Record<LabelColor, string> = {
  green:  'bg-emerald-500', yellow: 'bg-yellow-400', orange: 'bg-orange-400',
  red:    'bg-red-500',     purple: 'bg-purple-500', blue:   'bg-blue-600',
  sky:    'bg-cyan-400',    lime:   'bg-lime-400',   pink:   'bg-pink-400',
  black:  'bg-slate-700',
};

/** Tailwind arbitrary-value classes bound to the CSS label tokens. */
export const LABEL_CLASS: Record<LabelColor, string> = {
  green:  'bg-[var(--label-green)]',  yellow: 'bg-[var(--label-yellow)]', orange: 'bg-[var(--label-orange)]',
  red:    'bg-[var(--label-red)]',    purple: 'bg-[var(--label-purple)]', blue:   'bg-[var(--label-blue)]',
  sky:    'bg-[var(--label-sky)]',    lime:   'bg-[var(--label-lime)]',   pink:   'bg-[var(--label-pink)]',
  black:  'bg-[var(--label-black)]',
};
