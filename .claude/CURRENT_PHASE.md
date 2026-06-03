## Completed (confirmed by codebase audit + sessions 2026-05-31 → 2026-06-01)

- **Phases 1–13 (CLAUDE.md):** type system → accessibility
- **Beyond phase 13 (untracked extras):** dark/light theme, sidebar, workspace switcher, filter bar, view switcher (board/calendar/table/dashboard), notifications drawer, command palette, shortcuts overlay, bulk action bar, members/attachments/covers/checklists/linked cards, card+board templates, archive/restore, card numbering, board visibility
- **Phase 0 (2026-05-31):** Foundation audit — nanoid ^5.1.11 registered; tsc clean
- **Phase 1 (2026-05-31):** Board canvas — inline board background, fixed list dimensions, trello-* tokens on all inputs
- **Phase 2 (2026-06-01):** Card component — Trello-exact appearance, inline style for cover/labels, per-section padding
- **Phase 3 (2026-06-01):** DnD — TouchSensor (mobile), onDragCancel revert, card clone overlay
- **Phase 4 (2026-06-01):** Card modal — mobile fullscreen, backdrop blur, all sub-components token-ized
- **Phase 5 (2026-06-01):** App shell — topbar h-12/h-11 responsive, mobile search expand, sidebar overlay/responsive widths
- **Phase 6 (2026-06-01):** Responsive — snap-x lists, full-width mobile lists, notifications bottom sheet, prefers-reduced-motion
- **Phase 7 (2026-06-01):** Color alignment — zero hardcoded hex in UI components; all trello-* tokens
- **Phase 8 (2026-06-01):** Render optimization — lazy CardModal, CSS containment, useCallback on drag handlers
- **Phase 9 (2026-06-01):** WCAG AA — skip link, Enter/Space opens card modal, list-header keyboard, focus rings
- **Phase 10 (2026-06-01):** Features — inline label expansion (mini ↔ named pill toggle, board-wide state)
- **Phase 11 (2026-06-01):** Production-ready — ErrorBoundary, metadata, viewport, manifest.json, favicon.svg, security headers
- **Phase 12 (2026-06-01):** Micro-polish — modal-enter animation, drag overlay scale-105, btn active:scale, narrow card scrollbar, icon active:scale-90
- **Phase 13 (2026-06-01):** Final deployment — build clean, README written

## Polish + completion pass (2026-06-02)
- **Structural:** bottom view-navigation pill (keys 1–4); list collapse/expand to vertical bar (`toggleListCollapse`); sidebar collapses to desktop icon strip
- **List/card features:** full Trello list-actions menu w/ submenus (`list-actions.tsx`); move card with position picker; board copy (`copyBoard`); file (base64) attachments; card image covers; click-to-expand labels; card-count in list headers
- **Polish:** checklist completion celebration (green flash + "✓ Complete!" + toast); mobile list carousel dot indicator
- **Cleanup:** extracted `src/lib/colors.ts` + `src/lib/time.ts` (zero duplicated utilities); WCAG `--text-subtle` → `#9AABB8`; removed `@base-ui/react`, moved `shadcn` to devDeps; removed `DEPLOY TEST 999` debug heading from activity-section
- **Verify:** `npx tsc --noEmit` clean · `npx next build` clean

## Phase 1 — Postgres/Prisma backend (2026-06-02, INCREMENTAL)
- Chose incremental: DB layer added ALONGSIDE the localStorage app (legacy `/` untouched; build green).
- ORM: **Prisma 6.19.3 pinned** (v7 dropped `datasource.url`; needs adapter — avoided). Switched from the Drizzle scaffold (removed `src/db/`, `drizzle.config.ts`, drizzle deps).
- Added: `prisma/schema.prisma` + `seed.ts`; `src/lib/db.ts`; `src/lib/position.ts` (fractional); `src/features/{boards,lists,cards}/actions.ts` (Server Actions, `"use server"`); routes `/boards` + `/board/[boardId]` (read-only); `.github/workflows/ci.yml`; `.env.local.example`; `next.config.ts` (turbopack top-level + serverActions); package.json db scripts via dotenv-cli.
- Verified: `npx tsc --noEmit` PASS · `npx next build` PASS (with dummy DATABASE_URL; routes are force-dynamic).
- NOT done (deferred batches): store rewrite, Step-9 component rewiring, `/` → server grid, `db push`/`seed` + smoke tests (need real Neon `DATABASE_URL`).
- Note: had to kill the user's running `npm run dev` to unwedge an EBUSY lock during the Prisma reinstall — user must restart it.

## Phase 2 — Auth.js v5 + workspaces (2026-06-02, CODE COMPLETE)
- next-auth@5 beta + Prisma adapter + bcrypt + resend. JWT sessions; `auth.ts`, `proxy.ts` (Node runtime), `[...nextauth]` route.
- Schema += User/Session/Account/VerificationToken/Workspace/WorkspaceMember/BoardMember/Invitation + WorkspaceRole; Board += workspaceId/createdById; Comment author→userId+author.
- All board/list/card actions gated with `requireAuth()` + workspace-ownership checks. Auth/workspace/invite server actions + sign-in/sign-up/invite pages. Top-bar shows session user + sign out.
- Verified: `tsc` PASS · `next build` PASS (dummy DATABASE_URL+AUTH_SECRET; proxy built as middleware).
- DEFERRED (need real secrets/DB): `prisma migrate dev --name add-auth-and-workspaces`, `db seed`, Google OAuth, runtime verification.
- KNOWN GAP: Google-first sign-ins create a User but NO workspace → `workspaceId` null → empty boards. Needs a create-workspace-on-first-OAuth hook. Legacy `/` app is auth-gated but still localStorage (board-switcher createBoard hits the store, not the server action).

## Current
**Phase 2 code-complete (build green)** — pending DB migrate/seed + auth secrets to run live

## Blocked
None

## Next Session Prompt
No active work. For maintenance: `npx tsc --noEmit && npx next build`
Potential future work: CalendarView/TableView → store modal state, extract colors.ts, popover bottom-sheets on mobile, fix ListMenu stubs.
