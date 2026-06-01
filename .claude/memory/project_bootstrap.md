---
name: project-bootstrap
description: Trello clone project status — PRODUCTION READY as of 2026-06-01; build clean, all 13 phases complete
metadata:
  type: project
---

Project is PRODUCTION READY as of 2026-06-01.

**Why:** All 13 development phases completed across sessions on 2026-05-31 and 2026-06-01.

**How to apply:** Future sessions should start with `npx tsc --noEmit && npx next build` to verify clean state before any changes. Refer to `.claude/TECH_DEBT.md` for remaining low-severity items.

**Build status:** `npx next build` passes clean (Next.js 16.2.6, Turbopack). Zero TypeScript errors.

**nanoid:** confirmed at ^5.1.11 in package.json dependencies — no longer missing.

**Key architecture decisions made:**
- All components are `'use client'` — no RSC data fetching
- State is flat normalized `Record<ID, Entity>` maps
- Board background uses `style={{ background: board.background }}` inline (not Tailwind class lookup)
- CardModal is `next/dynamic` lazy-loaded for code splitting
- Label expansion is a separate tiny Zustand store (`src/lib/label-expansion.ts`)
- ErrorBoundary class component at `src/components/ui/error-boundary.tsx`
