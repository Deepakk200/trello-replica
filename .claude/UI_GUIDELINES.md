## Color System (CSS vars in globals.css)

### Dark theme (default — :root, .dark)
| Token | Value |
|---|---|
| `--background` | #1D2125 |
| `--surface` | #22272B |
| `--surface-raised` | #282E33 |
| `--surface-overlay` | #323940 |
| `--list-bg` | #101204 |
| `--card-bg` | #22272B |
| `--card-hover` | #2A2F34 |
| `--text-primary` | #B6C2CF |
| `--text-secondary` | #9FADBC |
| `--text-subtle` | #8C9BAB |
| `--text-on-bold` | #FFFFFF |
| `--border-default` | #A6C5E229 |
| `--accent` | #579DFF |
| `--primary` | #1D7AFC |
| `--success` | #4BCE97 |
| `--warning` | #F5CD47 |
| `--danger` | #F87168 |

### Light theme (.light class on <html>)
| Token | Value |
|---|---|
| `--background` | #F7F8F9 |
| `--surface` | #FFFFFF |
| `--list-bg` | #F1F2F4 |
| `--card-bg` | #FFFFFF |
| `--text-primary` | #172B4D |
| `--text-secondary` | #44546F |
| `--accent` | #1D7AFC |
| `--danger` | #C9372C |

### Label colors (CSS vars)
`--label-green` `--label-yellow` `--label-orange` `--label-red` `--label-purple` `--label-blue` `--label-sky` `--label-lime` `--label-pink` `--label-black`

### Tailwind token usage (via @theme inline)
Prefix: `trello-*` e.g. `bg-trello-bg`, `text-trello-text`, `border-trello-border`
Shadow tokens: `shadow-card`, `shadow-card-hover`

## Typography
- Font: Inter (Google Fonts via next/font)
- Body text: `text-sm` (14px) predominant
- Card titles: `text-sm font-medium`
- Section labels: `text-[11px] uppercase tracking-wider font-semibold`
- TopBar logo: `font-bold text-sm`

## Spacing Patterns
- TopBar height: `h-10` (40px)
- List width: `w-72` (288px) / `w-65` sidebar
- Card padding: `p-2.5` inner, `mx-2 mb-2` spacing
- Popover padding: `p-3`
- Button heights: `h-7` (inputs), `h-8` (buttons), `h-10` (topbar)
- Border radius: `rounded` (4px), `rounded-lg` (8px), `rounded-xl` (12px)

## Component Patterns
- **Buttons**: `.btn-primary` (blue fill), `.btn-soft` (surface fill), `.btn-ghost` (transparent hover)
- **Inputs**: `bg-trello-surface/50 rounded px-2 text-sm outline-none focus:bg-trello-surface`
- **Popovers**: `bg-[#282e33] rounded-lg shadow-2xl border border-white/10 p-3 z-50`
- **Cards**: `bg-trello-cardBg rounded-lg shadow-card hover:shadow-card-hover`
- **Overlays/Modals**: `createPortal` to `document.body`; backdrop `bg-black/40`

## Dark/Light Mode
- Default: dark. Toggled via `useThemeStore.toggleTheme()`.
- `ThemeProvider` applies `.dark` or `.light` to `document.documentElement`.
- Components use `trello-*` tokens — no hardcoded colors in logic.
- Exception: some filter/bulk-action components use hardcoded Slate/Tailwind classes (tech debt).

## Animation
- `anim-card-enter` — 0.18s slide-in-down for new cards
- `anim-list-enter` — 0.22s slide-in-right for new lists
- Sidebar transition: `duration-200 ease-in-out` translate
