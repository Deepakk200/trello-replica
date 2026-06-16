# Trello Clone — Handoff

## "TaskFlow series" cherry-picks — GitHub OAuth · slug URLs · marketing/onboarding · emoji reactions (2026-06-16)

The DB/auth/realtime/workspaces/templates/automation foundation the 12-prompt "TaskFlow" series describes **already exists** in this repo — so rather than rebuild it (which would destroy the auth/workspace/billing stack) I built only the **genuinely-new deltas** that are safe + verifiable to `tsc`/build/eslint **without** a live DB. **Excluded by necessity:** provisioning (no Neon creds — only the user can) and the TanStack-Query data-layer rewrite (invasive + DB-unverifiable; would regress the working optimistic flow).

- **Schema (additive, `prisma generate` clean; `db push` deferred — no local DB):** `Board` += `shortId @unique`, `slug`, `backgroundType`; `Card` += `shortId @unique`, `slug`; new **`Reaction`** model (`@@unique([commentId,userId,emoji])`) + `Comment.reactions`.
- **GitHub OAuth (prompt 02 delta):** `src/lib/auth.ts` registers a **GitHub** provider *conditionally* (only when `GITHUB_CLIENT_ID` is set, inert otherwise) alongside Google + Credentials; "Continue with GitHub" button in the sign-in form. Env: `GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET`.
- **Pretty-URL routing (prompt 03 delta):** `src/lib/slug.ts` (`slugify`, `shortId`); `createBoard`/`createCard` populate `shortId`+`slug`. Resolver routes `src/app/b/[shortId]/[slug]/page.tsx` + `src/app/c/[shortId]/[slug]/page.tsx` (await params) look up by `shortId`-or-id and `redirect` to `/board/[id]` (card → `?card=`). Coexists with the legacy `/b` page.
- **Marketing + onboarding (prompt 12 delta):** `src/app/welcome/page.tsx` — public landing + features + 3-tier pricing (auth-aware CTA; `/welcome` added to `proxy.ts` PUBLIC_PREFIXES). Kept `/` as the authenticated app. `src/app/onboarding/page.tsx` — client wizard (welcome → name workspace via local store → first board) → `/boards`.
- **Emoji reactions (prompt 06 delta):** `toggleReaction(commentId, emoji)` action (authz `requireCardEdit`); `getCardDetails` includes `comment.reactions`; `components/db-board/comment-reactions.tsx` renders grouped chips + a preset picker in the card-modal feed.
- **Verify:** `tsc` clean · `next build --webpack` clean (new routes `/welcome`, `/onboarding`, `/b/[shortId]/[slug]`, `/c/[shortId]/[slug]`) · changed-file eslint clean. **DB-runtime acceptance** (reactions persist, slug resolves, GitHub login) needs the deferred `db push` + provider creds.

## Workspace sub-pages — Members / Settings / Billing (2026-06-15) — frontend MOCK

The workspace home (`/`) + `WorkspaceSidebar` linked to Members/Settings/Billing, but those were **dead `<button>`s**. Built them as real pages. **Routing shape:** a new `/w` segment with a shared `layout.tsx` (reuses the global `TopBar` + `WorkspaceSidebar`) hosting `/w/members`, `/w/settings`, `/w/billing`. Chose `/w/*` to avoid the existing DB-app routes `/settings` (Phase-5 workspace settings) and `/boards` (Phase-1 grid). Workspace home stays at `/`; the board view stays at `/b`. **All frontend/mock — swap-ready for the DB/auth/RBAC + Stripe phases** (marked with comments in each file).

- **Audit:** Boards (workspace-home grid + create) = WORKS (left as-is). Templates link = WORKS (gallery from the prior sprint; sidebar links to `/templates`). Members/Settings/Billing = DEAD → built. Task-6 polish (card modal, calendar, account dropdown, resize dividers, dock) = all already WORKS (no regressions).
- **Store (persisted, `trello-clone-v1` v9→v10):** added `workspaceMembers: WorkspaceMember[]` (`{id,name,email,role,avatarColor}`), `workspaceDescription`, `workspaceVisibility ('private'|'public')`, `workspaceAvatarColor`; actions `inviteWorkspaceMember(name,email,role)` / `changeWorkspaceMemberRole` / `removeWorkspaceMember` + `setWorkspaceDescription/Visibility/AvatarColor` (reused existing `workspaceName`/`setWorkspaceName`). Wired into seed (`buildWorkspaceMembers`, seeded current mock user as Admin + 2 placeholders), `partialize`, `migrate` (defaults for pre-v10 stores), and `clearAll`. Types added in `src/types/index.ts` (`WorkspaceMember`, `WorkspaceMemberRole`, `WorkspaceVisibility`).
- **Members** (`components/workspace/members-page.tsx`): "Workspace members (N)" header + Invite-members toggle (email + role + Send), members table (avatar/name/email + role `<select>` + Remove), Guests empty state. All mutations persist.
- **Settings** (`settings-page.tsx`): editable name/description, visibility radios (Private/Public) with explainer, avatar color picker — all write to the store **live** (the sidebar header reflects name/color immediately). Danger-zone "Delete workspace" → mock confirm modal (no destructive action).
- **Billing** (`billing-page.tsx`): current-plan card (Free) + Free/Premium/Enterprise comparison (static prices + check/minus features) + "Upgrade" → stub modal ("billing coming soon"). Billing-history empty state. The top-bar **trial badge** (`top-bar.tsx`) now links to `/w/billing`.
- **Sidebar** (`workspace-sidebar.tsx`): rewritten to use `next/link` + `usePathname` for active highlighting; sub-items route to `/`, `/w/members`, `/w/settings`, `/w/billing`; workspace header reads live `workspaceName`/`workspaceAvatarColor`.
- **tsconfig:** excluded the untracked `trello-replica-backup/` copy (a stale repo backup that was being pulled into `tsc`/build via `**/*.ts`).
- **Verify:** `tsc` clean · `next build --webpack` clean (routes `/w/members`,`/w/settings`,`/w/billing` added) · changed-file eslint clean. Refresh-persistence holds (invite/role/remove/name survive Ctrl+Shift+R via the persisted store).

## Template gallery + Butler automation + AI features (2026-06-15) — MODE LOCAL

Three feature prompts (Template Gallery; Butler Automation; AI) built against the **legacy localStorage/Zustand app** (where the rendered chrome — `TopBar`, `WorkspaceSidebar`, board header/card modal — and board data live). **MODE = LOCAL** for all three: `DATABASE_URL` is empty locally so a DB build would be unverifiable, and legacy boards already persist to Postgres via the 1c snapshot-sync (so created boards survive refresh + sync cross-device for free). The DB app's separate template/AI systems (`template-defs.ts`, `features/ai/actions.ts`) are left untouched. **Committed locally only — never pushed** (per the templates prompt's "do not commit to github").

**Template gallery** — real `/templates` route (was: a dead `WorkspaceSidebar` "Templates" item + an unused modal):
- `src/data/templates.ts` — 18 templates across 13 categories (shape mirrors the planned Prisma Template tables → mechanical DB upgrade). `src/features/templates/queries.ts` (listTemplates/getTemplate/categoryCounts + `userTemplateToGallery` for "Your templates"). `src/store/use-template-views.ts` — persisted view-count increments.
- `src/features/templates/clone.ts` `createBoardFromGalleryTemplate(template,{name,workspaceId?,background?})` — builds an INDEPENDENT board (fresh ids) via the **real store actions** (createBoard→createList→createCard→updateCard→upsertLabel/toggleCardLabel→createChecklist/addChecklistItem); editing it never touches the template.
- UI: `src/app/templates/{layout,page,[templateId]/page}.tsx` (layout renders the global TopBar; detail awaits `params`). `components/templates/{gallery,template-card,template-detail,use-template-modal}.tsx` — category sidebar (+mobile dropdown), debounced search, responsive grid, skeleton/empty, detail "what's included" + "Use this template" modal (name/workspace/background) → clone → `/b`. View count increments on detail open. `WorkspaceSidebar` "Templates" → `/templates`. **Save as template**: board ⋯ menu (`board-menu.tsx`) → `saveBoardAsTemplate` → appears under "Your templates".

**Butler automation** (rule engine + card/board buttons) — `src/lib/automation/{types,bus,engine}.ts` + `src/store/use-automations.ts` (persisted, per-board):
- **Decoupled event bus** (`bus.ts`): the board store emits `card.moved`/`card.created`/`due.set`/`card.completed`/`label.added|removed`/`checklist.completed` after the relevant mutations (edited `moveCard`/`createCard`/`updateCard`/`toggleCardLabel`/`toggleChecklistItem`); the engine registers as the handler via `<AutomationRunner/>` (mounted in root `layout.tsx`). No import cycle (store → bus only).
- **Engine** (`engine.ts`): matches enabled rules (trigger + optional list/label) whose conditions pass (has/no-label, has-due, in-list, title-contains), runs actions IN ORDER via the **real store actions** (move top/bottom, complete, add/remove label, set-due "+N days"/remove-due, archive, comment, add-checklist-item), logs a `Butler (rule): …` activity line. **Loop guard**: module depth counter, MAX_DEPTH 5. `summarize()` gives plain-English text for the UI.
- **UI**: `Bot` button in `board-header.tsx` → `AutomationPanel` (tabs Rules / Card Buttons / Board Buttons; sentence-style builder with trigger/condition/action dropdowns; enable/disable + delete; a starter rule "When moved to Done → complete + shipped label"). **Card buttons** render in the card-modal sidebar (run on that card); **board buttons** render in the header (run across the board's cards).
- **Deferred (LOCAL-legit):** scheduled commands + `due.approaching` (the prompt scopes these to MODE-DB Vercel Cron / a timer).

**AI features** (server-side only — `ANTHROPIC_API_KEY`, already in `.env.local.example`) — `src/features/ai/assist.ts` (`"use server"`, reuses `src/lib/ai.ts`):
- `aiImproveDescription`, `aiSummarizeText`, `aiBreakIntoChecklist` (zod-validated JSON array), `aiGenerateBoard` (zod-validated `{title,lists[cards]}`), `aiSummarizeBoard`. Each wrapped → returns `{ok:false,error}` on missing key / parse failure; **rate-limited** via `rateLimits.ai` (no-op without Upstash); inputs truncated (cost guard).
- **UI (review-before-apply — never auto-mutates):** `components/ai/card-ai-assist.tsx` (card modal: break-into-checklist/improve/summarize → preview → Accept), `create-board-with-ai.tsx` (in the gallery header → prompt → preview → builds via the **clone path**), `board-summary-button.tsx` (Sparkles in board header → status summary).
- **Verify:** `tsc` clean · `next build --webpack` clean (24 routes incl. `/templates`, `/templates/[templateId]`) · changed-file eslint = **0 errors**. **NOT verifiable locally:** live AI calls (need `ANTHROPIC_API_KEY`) — actions degrade gracefully. Template clone, automation rules/buttons, and view-count persistence ARE exercisable locally (localStorage).

## Testing + CI/CD — Vitest unit/integration + Playwright E2E + CI gate (2026-06-14) — "Phase 7" prompt

First test suite for the repo (none existed). Same branch as Phases 3–6 (`feat/workspaces-rbac-sharing`). Test deps installed with `--ignore-scripts` (the running `next dev` holds the Prisma DLL → postinstall `prisma generate` EPERMs; types were already generated).

- **Tooling:** `vitest@4` + `@vitejs/plugin-react` + `@testing-library/*` + `jsdom` + `@vitest/coverage-v8` + `@playwright/test`. `vitest.config.ts` (jsdom env, `@`→`src` alias, `tests/setup.ts` adds jest-dom matchers, v8 coverage over `lib`/`features`/`store`). **`tsconfig.json` now excludes `tests/`** so `tsc --noEmit` (app) doesn't pull vitest/playwright globals.
- **Refactor for testability (no behavior change):** the pure role logic moved from `authz.ts` → **`src/lib/roles.ts`** (`roleCanEdit`/`roleCanAdmin`/`roleRank`/`pickHigherRole`); `authz.ts` imports + re-exports them. This lets unit tests import role logic **without** dragging in `next-auth`→`next/server` (which vitest can't resolve).
- **Unit tests (`tests/unit/`, 32 tests, run + GREEN locally):** `position.ts` (midpoint insert at ends/between, monotonic ordering under repeated inserts, rebalance), `roles.ts` (OWNER/ADMIN/MEMBER/GUEST/OBSERVER edit+admin matrix, `pickHigherRole` effective-role), `time.ts` (timeAgo buckets w/ fake timers, formatDate), `sanitize.ts` (`<script>`/`onclick`/`javascript:` stripped, allowed tags kept), `colors.ts`.
- **Integration tests (`tests/integration/board-actions.test.ts`):** real server actions (`createBoard→createList→createCard→moveCard` positions, `toggleCardLabel`, comment create/delete, **authz rejects a non-member**, workspace **isolation** in `getBoards`) against a real Postgres. The request layer is mocked (`vi.mock` on `@/lib/auth`, `next/headers`, `next/cache`, `@sentry/nextjs`) so actions run outside a Next request while DB writes stay real; `TRUNCATE … CASCADE` resets between tests. **Gated on `INTEGRATION=1`** → skips cleanly with 0 failures locally (no DB); runs in CI against the Postgres service.
- **E2E (`tests/e2e/`, Playwright):** `auth.setup.ts` (sign up → sign in → save `storageState`), `board.spec.ts` (template→list→card→reload **persistence proof**), `card-modal.spec.ts` (open card, add comment). `playwright.config.ts` boots the **real built app** via `webServer: npm run start` (HARD RULE: no DB mocks). **CI-only — not runnable locally** (needs DB + built app + browsers); selectors are placeholder/role/text-based and may need tuning on the first CI run.
- **CI (`.github/workflows/ci.yml`), two gated jobs:** **quality** (install → `prisma generate` → `tsc` → `eslint .` → unit+coverage → build, uploads coverage) and **db-tests** (`needs: quality`; Postgres 16 service → `prisma db push` → integration `INTEGRATION=1` → build → `playwright install` → e2e → uploads `playwright-report`). A broken commit fails `tsc`/unit/build and **blocks merge**. **`eslint .` (errors-only) kept, NOT `--max-warnings 0`** — the repo carries ~134 pre-existing legacy `react-hooks` warnings in the localStorage app; enforcing zero would permanently red the gate. Cleaning those is the prerequisite to flip it (documented in the workflow).
- **Scripts:** `test`, `test:unit`, `test:integration`, `test:watch`, `test:coverage`, `test:e2e`, `typecheck`.
- **Verify:** `tsc` clean · `vitest run` = **32 passed / 6 skipped** · `next build --webpack` clean (24 routes) · changed-file eslint clean. **NOT run locally** (documented, consistent ceiling): integration (no local `DATABASE_URL`) + E2E (no DB/browsers) — both execute in CI.

## Production hardening — enforced CSP, env validation, error boundaries, Sentry context (2026-06-14) — "Phase 6" prompt

Most of the hardening surface already existed (CLAUDE.md "Phase 7": Sentry client/server/edge + `onRequestError`, `logger`, `rate-limit`, `sanitize`, DB pooling in `db.ts`, `app/error.tsx`, CSP as **Report-Only**). This pass closed the genuine gaps. Same branch as Phases 3–5 (`feat/workspaces-rbac-sharing`).

- **`src/lib/env.ts` (NEW) — fail-fast env validation.** zod-validates the CORE vars (`DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`) and **throws with an actionable message** at runtime boot; **warns** (not throws) for missing optional integrations (Sentry/Upstash/Liveblocks/UploadThing/Google/Anthropic/Resend/Stripe). Wired into `instrumentation.ts register()` (nodejs runtime). **Deliberately skips `next build` (`NEXT_PHASE`) and non-production** so the build + env-free localStorage app keep working (reconciles HARD RULE "fail fast" with the project's build-safe/degrade-gracefully design).
- **CSP now ENFORCED** (`next.config.ts`): `Content-Security-Policy-Report-Only` → `Content-Security-Policy`. Added `worker-src 'self' blob:` (Sentry replay worker + Serwist SW), `manifest-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `upgrade-insecure-requests`. **`'unsafe-inline'/'unsafe-eval' retained** in `script-src` (Next inline bootstrap + dep eval; nonces = future pass). All external origins already allowlisted (Liveblocks WSS, UploadThing/ufs, Sentry ingest, Stripe, Google fonts/avatars). `X-Frame-Options` → **DENY**; HSTS bumped to 2y + `preload`. **Enforced CSP not runtime-verified locally** — watch the browser console on the Vercel deploy for violations and widen the allowlist if needed.
- **Sentry request context (HARD RULE 3):** rather than wrap all ~40 actions, context is set centrally in `authz` — `requireUser` → `Sentry.setUser({id,email})`, `requireBoardAccess` → `Sentry.setTag("boardId", …)`. Combined with the existing `onRequestError` (auto-captures thrown server-action/route errors), **any error thrown downstream carries userId + boardId**. Added `logger.captureError(err, ctx)` (logs + `Sentry.captureException` with extras; Sentry import is dynamic + guarded) for explicit catches.
- **`app/global-error.tsx` (NEW)** — root-layout error boundary (renders its own `<html>/<body>`, captures to Sentry, "Try again"). **`app/not-found.tsx` (NEW)** — friendly 404 (now prerendered as `/_not-found`). `app/error.tsx` (route boundary) already existed.
- **Rate limiting extended:** the UploadThing `cardAttachment` middleware now `checkRateLimit(rateLimits.api, upload:<userId>)` (per-user; no-op without Upstash) in addition to the existing auth/search limiters.
- **Already satisfied (verified, not re-done):** every server action is zod-validated (Phases 1–5) + authz-gated (Phase 3); user HTML is sanitized server-side (`sanitizeHtml` on `updateCard`/comments) and the legacy markdown editor uses `react-markdown` **without `rehype-raw`** (raw `<script>` rendered as inert text → no XSS); raw SQL in search is parameterized (`$queryRaw` tagged templates); Prisma is a pooled singleton.
- **`DIRECT_URL`:** documented in `prisma/schema.prisma` + `.env.local.example` but **left OFF** by default — adding `directUrl = env("DIRECT_URL")` makes `prisma generate` (Vercel `postinstall`) fail when the var is unset, which would break the current DATABASE_URL-only deploy. Enable both together when splitting pooled/direct on Neon.
- **Env added to `.env.local.example`:** `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`, commented `DIRECT_URL`.
- **Verify:** `tsc` clean · `next build --webpack` clean (24 routes; `/_not-found` prerendered) · eslint changed files = **0 errors** (1 pre-existing unused-`no-console`-disable warning in `logger.ts`). React Compiler still OFF (needs babel plugin). **NOT verified locally:** CSP-on smoke, Sentry event delivery, live 429 (need deploy + secrets).

## File storage + full-text search wired to RBAC (2026-06-14) — "Phase 5" prompt

The prompt assumed base64/localStorage attachments + local-filter search; both were **already real** (UploadThing v7 object storage since Phase 6; Postgres `tsvector` FTS since Phase 4). The actual work was **wiring storage + search to the Phase-3 `authz`** (they still used the old single-workspace check) and finishing the Cmd+K palette. On the **same branch as Phase 3/4** (`feat/workspaces-rbac-sharing`), since it depends on `src/lib/authz.ts`.

- **Schema (additive):** `Attachment += uploadedById String?` + `uploadedBy User?` relation (+ `User.attachments`). Kept `fileType`/`fileSize` names (NOT renamed to `type`/`size` — would break Phase-6 UI + need a data migration). `db push` deferred to deploy (no local `DATABASE_URL`).
- **Upload auth → authz (`api/uploadthing/core.ts`):** `cardAttachment` middleware now resolves the card's board and authorizes via `getBoardAccess(boardId).canEdit` — workspace member / board member / creator with edit rights; **OBSERVER + non-members rejected** (was: `workspaceId` ownership only). `onUploadComplete` stores `uploadedById`. No base64 anywhere in the DB app (legacy localStorage app still uses base64 — out of scope per the Phase-3 boundary). 16MB cap (images/pdf), 4MB text.
- **Search → authz-scoped (`features/search/actions.ts`):** renamed to **`globalSearch`** (`search` kept as alias). Scopes the tsvector queries to **every board the user can access** — `workspace member OR board member OR visibility='public'` — via `id = ANY(${boardIds}::text[])` (was: `workspaceId = session default` only, which missed shared/public boards). Added a **Members** result set (workspace peers matched by name/email ILIKE). Cards still `ts_rank`-ordered; rate-limit preserved. **No cross-user leakage** (boards the user can't access never enter the id set).
- **Cmd+K palette (`search-palette.tsx`) — finished:** groups **Cards / Boards / Members**; **arrow-up/down + Enter** keyboard nav over a flattened list; **recent searches** persisted in `localStorage` (`tc:recent-searches`, shown when empty); 250ms debounce; loading/empty states. **Card result opens the card modal on its board** via `/board/[id]?card=<cardId>` — `DbBoardView` reads `?card` (`useSearchParams`) and opens the modal. Board → `/board/[id]`; member → close (no member page).
- **Cmd+K now global:** moved `<SearchPalette/>` from the legacy `top-bar` into the **root `layout.tsx`** (inside `SessionProvider`) so it works on the **DB board pages** too (previously legacy-chrome only). Single instance → no double-toggle.
- **Env:** none new (`UPLOADTHING_TOKEN` already present from Phase 6; search is Postgres-only).
- **Verify:** `tsc --noEmit` clean · `next build --webpack` clean (24 routes) · eslint changed files = **0 errors** (only pre-existing `set-state-in-effect` palette warnings). **Local `prisma generate` hit the known Windows DLL-rename EPERM** (a running `next dev` held the old `query_engine` dll) — but the **TS types (`index.d.ts`) were written before the dll step**, so tsc/build are correct; the engine dll refreshes on dev restart / Vercel `postinstall`. **NOT verified locally** (no `DATABASE_URL`): the acceptance matrix (upload image→thumbnail/cover/persist/realtime, 5MB+ upload, Cmd+K finds cards across accessible boards, no results from inaccessible boards, result navigation + kbd nav) → exercise on the **Vercel deploy**. `db push` for `Attachment.uploadedById` deferred to deploy.

## Workspaces + Members + RBAC + Sharing + Card Assignment (2026-06-14) — "Phase 3/4" prompt

Applied the generic "Phase 3 (workspaces/RBAC) + Phase 4 (realtime/notifications)" prompt to the **real DB app** (`/boards`, `/board/[id]`, `/settings`). Most of the prompt's *schema* and *Phase-4* surface already existed (Liveblocks realtime, presence, cursors, activity, notifications, @mentions, bell — see Phase 3/4 entries below); the genuine gap was the **application-level RBAC** + multi-workspace + sharing/assignment **UI/actions**. Schema was already there from sub-phase 1a, so only **two additive enum/field changes** + `prisma generate` (no `db push` locally — `DATABASE_URL` empty, same ceiling as all prior phases; regen happens on Vercel `postinstall`).

- **Schema (additive):** `WorkspaceRole` += `OBSERVER` (read-only; **kept** `GUEST`, treated identically by authz — did NOT rename the enum, which would be a destructive Postgres migration). `BoardMember` += `role WorkspaceRole @default(MEMBER)` + `@@index([userId])`. The prompt's `CardMember` = the existing **`CardAssignee`** model (reused; not duplicated).
- **`src/lib/authz.ts` (NEW — HARD RULE #1 centralization):** the single authorization module. `getActiveWorkspaceId` (cookie `tc_active_workspace` → validate membership → fallback to oldest membership), `requireUser/requireActiveWorkspace`, `getMembership`, `requireWorkspaceMember/Admin`, `getBoardAccess` (workspace member OR board member OR creator OR public-board⇒read-only; effective role = strongest of the three), `canAccessBoard` (used by Liveblocks room auth), `requireBoardAccess/Edit/Admin`, `requireList/CardEdit`, `requireCardAccess`. Role semantics: OWNER/ADMIN→admin+edit, MEMBER→edit, **GUEST/OBSERVER→read-only** (`canEdit:false`). (`server-only` pkg not installed → not imported; module is server-only by virtue of `next/headers`+`auth`.)
- **Multi-workspace switching:** the JWT still carries a default `workspaceId`, but the **active** workspace is now cookie-driven via authz, so a user can belong to many workspaces and switch. `switchWorkspace`/`createWorkspace`/`acceptInvitation`/`deleteWorkspace` set/clear the cookie. **Peripheral features deliberately left on the session default workspace** (search, enterprise audit/api-keys/webhooks, billing, `/api/boards`, uploadthing core) — they don't yet honor the active-workspace cookie; documented limitation, not a regression.
- **Server actions rewired to authz** (replaced Phase-2 owner-only `assertBoardAccess(boardId, session.workspaceId)`): all of `boards/`, `lists/`, `cards/` actions now gate through `requireBoardEdit`/`requireBoardAdmin`/`requireListEdit`/`requireCardEdit`/`requireBoardAccess`. **OBSERVER/GUEST mutations throw "Not authorized".** `getBoard`/`getCardDetails` attach `_access {role,canEdit,canAdmin}` so the UI can gate affordances; both fetches now include real `assignees` (+ board `members`).
- **New actions.** `workspaces/`: `createWorkspace`, `renameWorkspace`, `deleteWorkspace` (owner-only, can't delete your last), `switchWorkspace`, `listMyWorkspaces`, `listWorkspaceMembers`, `changeRole`, `getMyWorkspacesWithBoards`/`getSharedBoards` (landing); `invite`/`remove` now admin-gated on the active workspace; invite/role enums include OBSERVER. `boards/`: `setBoardVisibility` (private/workspace/public), `addBoardMember`(by email)/`removeBoardMember`/`listBoardMembers`. `cards/`: `listAssignableMembers`, `assignCardMember`/`unassignCardMember` (real `CardAssignee`, writes `member.assigned/unassigned` activity).
- **UI (DB app).** `db-workspace-switcher.tsx` (switch + create; on `/boards` + `/settings`). `/boards` landing **grouped by workspace** + "Shared with you" section. `board-share-bar.tsx` (real member avatar stack + Share dialog: add-by-email+role, member list+remove, visibility radio, copy link). `db-board-view`: **View-only badge** + edit affordances (add/delete card+list, list menu, drag, delete buttons) hidden for non-editors; **assignee avatars on cards**. `db-card-modal`: **Members section** (assignee avatars + assign/unassign popover) + cover/description/comment controls gated by `canEdit`. `settings-tabs`: per-member **role dropdown** (`changeRole`) + invite-role select + working **Delete workspace** danger zone (owner). `board-activity-drawer.tsx` (Phase-4 board-level activity feed). **Liveblocks room auth** (`/api/liveblocks-auth`) now uses `authz.canAccessBoard` (board member/creator/public, not just same-workspace).
- **Legacy localStorage app (`/`, `/b`): intentionally unchanged.** Its workspace switcher / members are **fake by design** (Zustand `Member{id,name,initials,color}`) and the snapshot-sync (1c) deliberately excludes members/workspace-grouping because `CardAssignee` needs real users. Real multi-user RBAC lives in the DB app; converting the legacy app would break the 1c contract. (Flagged: the user asked to "complete everything"; this is the principled boundary — offered as follow-up.)
- **Verify:** `tsc --noEmit` clean · `next build --webpack` clean (24 routes) · eslint on changed files = **0 errors** (only pre-existing legacy `set-state-in-effect`/`no-img-element` warnings). **No new env vars** (cookie-based). **NOT verified locally** (no `DATABASE_URL`): the acceptance matrix (invite bob → sees shared boards; MEMBER edits / OBSERVER blocked; assign member → avatar persists; non-member "Not authorized"; role change takes effect; second workspace + switch; cross-browser) must be exercised on the **Vercel deploy**. **Deferred to deploy:** `prisma db push` (additive enum value + BoardMember.role + index).

## Legacy→DB migration — sub-phase 1c (2026-06-13): legacy store ↔ Postgres snapshot sync

Completes the visible-app persistence: the **legacy localStorage Zustand app** (`/`, `/b`) now persists its board *data* through the **existing** Prisma stack — survives hard refresh and syncs across devices/browsers — **with auth intact** (NOT the no-auth rebuild some prompts assume; that would have torn out the Auth.js/workspace/billing stack). **No schema change** — every column used was already added additively in 1a, so no `db push`/migration. Chosen approach (user-confirmed): **snapshot load/save sync**, NOT 70 per-mutation server actions — the store and all ~70 of its mutations are left **untouched**; only its data *source* changes.

- **`src/features/legacy-sync/types.ts`** — `LegacySnapshot = Pick<BoardState,'boards'|'lists'|'cards'|'labels'>` (the only slices round-tripped to the DB).
- **`src/features/legacy-sync/actions.ts`** (`"use server"`):
  - `loadLegacyState()` — reconstructs the legacy board graph from Postgres for the current user; returns `null` when nothing's synced yet (→ client keeps local seed + imports).
  - `saveLegacyState(snapshot)` — transactional **delete-and-recreate** of the user's legacy graph (small, single-user → diff-free). Builds flat `createMany` row sets in FK order (Board→List→Label→Card→CardLabel→Checklist→Item→Comment→Attachment→Activity). Activities use `onDelete: SetNull`, so they're deleted explicitly by board/card **before** dropping boards.
  - **Isolation:** legacy boards live under a dedicated per-user workspace (`slug = legacy-<userId>`, name "Legacy Local Boards") so they never intermix with the db-board app's boards (scoped by the session's personal `workspaceId`). **IDs:** the store's nanoid ids are used verbatim as Prisma PKs → stable round-trips.
  - **Mapping:** `card.cover{type,color,image,size,textColor}` ↔ `coverColor`/`coverImage`/`coverSize`/`coverTextColor`; `card.activity` `type:'commented'` → `Comment` rows, the rest → `Activity` rows (`data:{text,authorInitials}`), merged+sorted back on load; checklist item `text/completed` ↔ `title/checked`; legacy **global** labels anchored to the first board on save, gathered back into the flat `labels` map on load; ordered arrays (`listIds`/`cardIds`) ↔ `Float position`.
- **`src/components/ui/legacy-db-sync.tsx`** (`<LegacyDbSync/>`, mounted in `layout.tsx` inside `SessionProvider`, next to `StoreNamespacer`): once authenticated **and** `_hasHydrated`, `loadLegacyState()` and apply over the local cache — **DB wins** (the network load resolves after the synchronous localStorage rehydrate, so it lands last). Then `boardStore.subscribe` → debounce 800ms → `saveLegacyState`, with a saving/dirty guard + `visibilitychange` flush. **DB-empty ⇒ one-time import** of existing local boards (Step 5c, automatic). On apply: `board.workspaceId` is remapped to an active **client** workspace, fake `memberIds` carried over from the local card of the same id, and `activeBoardId` repaired if stale.
- **NOT persisted (client-only seed / device-local, by design):** members roster + per-card `memberIds` (fake; `CardAssignee` needs real users), client workspace *grouping*, board/card templates, notifications, `inboxCards`, starred/recent, panel/calendar/labs UI prefs. These stay in localStorage. Multi–client-workspace grouping collapses to one workspace on cross-device load.
- **Verify:** `tsc --noEmit` clean · `npm run build` (webpack) clean (24 routes) · new files eslint-clean. **NOT verified locally — `DATABASE_URL` is empty in `.env.local` (no local Postgres, same ceiling as phases 2–9).** The acceptance checklist (refresh-persists, cross-browser, drag/reorder/label/checklist/comment/move-activity persistence) must be exercised on the **Vercel deploy** where `DATABASE_URL` is set. No migration needed (schema unchanged since 1a).

## Legacy→DB migration — sub-phase 1a (2026-06-13): additive schema for legacy parity

Goal of the in-progress migration: make the **visible legacy localStorage app** (`/`, `/b`) persist through the **existing** Prisma + Auth.js + server-action stack (NOT a rebuild — the backend already exists; see below). The legacy Zustand model is richer than the DB had, so 1a adds columns/models **additively** (safe for the existing DB app):
- **Board** += `description String?`, `nextCardNumber Int @default(1)`, `visibility String @default("workspace")`.
- **List** += `collapsed Boolean @default(false)`.
- **Card** += `startDate DateTime?`, `coverImage String?`, `coverSize String @default("half")`, `coverTextColor String?`, `number Int?`, `linkedCardIds String[] @default([])`, relation `assignees CardAssignee[]`.
- **New `CardAssignee`** join (`@@id([cardId,userId])`) + `User.cardAssignees` back-relation — legacy `card.memberIds` backed by real users.
Existing `Checklist`/`ChecklistItem` (`title`/`checked`) and `Comment` (`content`/`author`/`userId`) are reused as-is (mapping happens in the upcoming server-action layer). **Verify:** `prisma format` OK · `tsc` green · `build` green. **Deferred to deploy:** `prisma db push` (no local `DATABASE_URL`); the client regenerates on Vercel via `postinstall`. Local `prisma generate` is currently blocked by a Windows DLL lock from orphaned build workers — does not affect the schema commit. **Next:** 1b (confirm auth wiring), 1c (server actions mirroring legacy store mutations + store sync), 1d (identity — already largely done in the Auth-reconnect Part 1 below).

## Auth reconnect — Part 1 (2026-06-12): session-aware identity in the legacy app

The full **Auth.js v5 + Prisma** stack already existed (Phase 2): `src/lib/auth.ts` (Google + Credentials/bcrypt, JWT, `pages.signIn:'/sign-in'`), `prisma/schema.prisma` (`User.passwordHash`/`name`/`email`/`avatarUrl`, Account/Session/VerificationToken + workspaces/RBAC), `src/proxy.ts` guard (unauth → `/sign-in`; public: `/sign-in`,`/sign-up`,`/api/auth`,webhooks,cron,PWA/SEO assets), `/(auth)/sign-in`+`sign-up`, `src/features/auth/actions.ts` `signUpUser` (creates user + personal `"{name}'s Workspace"`). **A prior task had disconnected the chrome from the session and hardcoded `userName:'deepak chandra'` in the Zustand store** — Part 1 reconnects it. No new auth stack, kept `/sign-in`+`/sign-up` (NOT `/login`/`/signup`), kept `passwordHash`/`name` (no `username` field), kept `GOOGLE_CLIENT_ID/SECRET` env.

- **`src/hooks/use-current-user.ts`** — `useCurrentUser()` (client) reads `useSession()` → `{id,name,email,image,initials,isAuthenticated}` with graceful fallbacks (name → email local-part → 'User'). **Single source of truth for displayed identity.**
- **Reconnected to the real session:** `top-bar.tsx` avatar (photo via `bg-image` or initials), `account-menu.tsx` header (name/email/photo) + **Log out → `signOut({callbackUrl:'/sign-in'})`**, `card/activity-section.tsx` comment **author** (new optional `ActivityEntry.author`/`authorInitials`; composer + feed avatars show the real user).
- **Per-user local data:** `src/components/ui/store-namespacer.tsx` (mounted in `layout.tsx` inside `SessionProvider`) repoints the persist key to `trello-clone-v1:<userId>` and rehydrates once the session resolves (base key when signed out). `clearAll` now clears the active key. **One-time effect:** an existing logged-in user's old `trello-clone-v1` board data resets to a fresh seed under their namespaced key.
- The store's now-unused `userName`/`userEmail` fields/setters remain (harmless; nothing displays them).
- **Verify-on-Vercel:** real signup/login/refresh needs `DATABASE_URL`+`AUTH_SECRET`(+Google) — absent locally, so Part 1 was verified by tsc/eslint/build only; the live auth flow is tested on the deployment.

## UI pass — Completed (2026-06-10): Trello-authentic shell (legacy localStorage app at `/`)

Scoped to the **legacy Zustand app** (`src/components/{board,card,list,ui}` + `use-board-store`), not the DB app. NOTE: this app's nav model is **string-based**, not the numeric `activeView` some prompts assume — `activePanel: 'board'|'inbox'|'planner'` (main area) + per-board `activeViewByBoard: 'board'|'calendar'|'table'|'dashboard'` (via `ViewNavigation`).

- **Store/types:** added transient (non-persisted) `inboxOpen`/`switchBoardsOpen` + `setInboxOpen`/`setSwitchBoardsOpen` + `useInboxOpen`/`useSwitchBoardsOpen` selectors.
- **Inbox** is now a slide-in **left overlay** (`ui/inbox-panel.tsx`, quick-add + integration orbit empty state; quick-add is a console stub) controlled by `inboxOpen`. **Switch boards** is a slide-in **right overlay** (`ui/switch-boards-panel.tsx`, search + Starred/Your-boards, reads boards from the store). Both mounted at `app-shell` root (z-30 backdrop / z-40 panel).
- **Planner** rewritten as a 3-column **Today / This Week / Later** view (`board/planner-view.tsx`, classifies the active board's cards by `dueDate`), rendered for `activePanel==='planner'`. The old flat `panels/{inbox,planner}-panel.tsx` were **superseded and deleted**.
- **Bottom nav** (`ui/bottom-nav.tsx`): 4 tabs Inbox·Planner·Board·Switch boards (icons Inbox/CalendarDays/LayoutDashboard/ArrowLeftRight); the stray **"g p" badge → tooltip**; now **`md:hidden`** (mobile/tablet only). Desktop entry points added to the **sidebar** (Inbox/Planner/Board/Switch boards) so hiding the bar isn't a regression.
- **Board header** (`board/board-header.tsx`): added **Power-Ups (⚡)**, **Automation (🤖)**, **Filter** buttons with placeholder popovers (alongside existing title/star/visibility/avatars/invite/Share/Menu).
- **Per-list collapse** was **already implemented** (persisted `toggleListCollapse` + slim rotated strip + `ChevronLeft`); card-count badge already present; "Add another list" / dual add-card footer already present — left as-is.

**Deviations from the prompt (its snippets target a DB app + numeric `activeView`):** kept the existing string `activePanel` model (no numeric 1–6); InboxPanel/SwitchBoardsPanel/PlannerView adapted to the Zustand store + `@/types` (dropped `@/types/db`, server-action `createCard`, `getBoards`, `useRouter`); `Chrome` lucide icon → `Globe` (not exported in this version). **Verified:** `tsc` clean · `build` (webpack) clean · changed files eslint-clean.

**Nav model — FINAL (aligned to the repeatedly-pasted "UI Parity Sprint"):** Bottom nav is a **floating 4-tab dock**, **`md:hidden`** (mobile/tablet only): Inbox · Planner · Board · Switch boards (`bottom-nav.tsx`). Inbox tab → `setInboxOpen(true)` (**slide-in LEFT overlay**, `inbox-panel.tsx`, `createPortal`); Planner/Board → `setActivePanel`; Switch boards → `setSwitchBoardsOpen(true)` (**slide-in RIGHT overlay**, `switch-boards-panel.tsx`, `createPortal`, search + starred/all). app-shell main renders Planner (`activePanel==='planner'`) else Board; mounts both overlays at root (backdrop z-30 / panel z-40). `panel-url-sync.tsx` keeps `?panel=` ↔ `activePanel` (Back/deep-link/refresh). The earlier always-visible-3-tab and resizable-3-panel directions were **superseded** by this spec; the `panelLayout` store slice from the abandoned resizable attempt remains (unused, harmless). **Known deviation from this spec:** `ViewNavigation` (bottom-center pill: Board/Calendar/Table/Dashboard + its own board switcher) still renders on all sizes — views are not yet moved into the board-header "…" menu, so on mobile both it and the dock appear. Real-DB wiring (Inbox/Planner are the **localStorage** app) remains out of scope.

**UI Parity Sprint follow-up (same day):** Markdown card descriptions via **`react-markdown`** (only new dep; dark renderers in `description-editor.tsx`). Comment **edit/delete** — new store actions `updateComment`/`deleteComment` (operate on `card.activity` `type:'commented'` entries) wired into `activity-section.tsx`. Dashboard gained **stat cards + a pure-SVG donut** (due-date status) — **no `recharts`** (HARD RULE: no new deps beyond react-markdown; recharts isn't bundled in Next). **Calendar drag-to-reschedule** — own `DndContext` in `calendar-view.tsx` (draggable chips + droppable day cells → `updateCard` dueDate, preserving time); board DnD untouched. Header **Filter** popover now functional (wired to `filterState`/`setFilter`; non-matching cards greyed `opacity-30` in `list-column`, not hidden). Inbox/Switch panels now render via `createPortal(document.body)`.

## Phase 9 — Completed (2026-06-10): PWA · React Email · SEO · final polish

Four areas completing the product experience. Several Phase-9-prompt steps assumed Phase-8 work that was **deferred** (public landing page, `/dashboard`, PostHog) — those were adapted to the real codebase (see Deviations).

**A — PWA + offline (Serwist 9.5.11):**
- `src/app/manifest.ts` (file-based → `/manifest.webmanifest`; `start_url: /boards`), `public/icons/icon-{192,512}.svg` (+ README placeholders to swap for PNG), `public/screenshots/README.md`.
- `src/app/sw.ts` — Serwist SW source. **API note:** v9 exports `Serwist` + `PrecacheEntry` from the top-level **`serwist`** package (NOT `@serwist/sw`, which the prompt used); `defaultCache` from `@serwist/next/worker`; needs `/// <reference lib="webworker" />`. Offline fallback → `/~offline`.
- `src/app/~offline/page.tsx` (`force-static`), `src/components/ui/offline-banner.tsx` (online/offline events; initial sync deferred via `setTimeout` to stay eslint-clean), `src/components/ui/pwa-install-prompt.tsx` (`beforeinstallprompt`, 7-day dismissal).
- `next.config.ts` — wrapped `withSerwist(withSentryConfig(...))`. `disable: NODE_ENV !== "production"` (Serwist needs Webpack; dev stays Turbopack). `public/sw.js(.map)` gitignored.

**B — React Email (`@react-email/components`, `react-email`):** `emails/{base-layout,welcome,invitation,payment-receipt,due-date-reminder}.tsx` (dark brand, `PreviewProps`). `src/lib/email.ts` — central `sendEmail()` (lazy Resend, **no-op in dev**, never throws). Wired: `auth/actions.signUpUser` → Welcome; `workspaces/actions.inviteMember` → Invitation (replaced the old inline HTML); `api/webhooks/stripe` `invoice.payment_succeeded` → Payment Receipt to workspace OWNER. **Due-date reminders:** `src/features/notifications/due-date-reminders.ts` (`sendDueDateReminders`, groups cards by member) + `src/app/api/cron/due-reminders/route.ts` (Bearer `CRON_SECRET`) + `vercel.json` (cron `0 8 * * *`). Templates imported via `@/../emails/*`.

**C — SEO:** global metadata in `layout.tsx` (metadataBase, title template, OG/Twitter, keywords, `appleWebApp`, apple icon). `src/app/sitemap.ts` + `robots.ts`. `src/app/board/[boardId]/opengraph-image.tsx` (`next/og` `ImageResponse`; defaults for unauthenticated crawlers). Board `generateMetadata` now includes list/card counts + OG.

**D — Polish:** `onboarding-checklist.tsx` (wired into **`/boards`** — counts boards/cards/members/attachments, shown when `boardCount < 3`), `empty-state.tsx` (in `/boards` + legacy `board-switcher`), `keyboard-shortcuts-modal.tsx` (wired into `top-bar` Help button + global `?`). **Dark/light system-preference detection was already implemented** in `theme-provider.tsx` (Step 8 was a no-op — skipped `ThemeInitializer`).

**Modified:** `package.json` (`build` → `next build --webpack`; `email:preview` script), `proxy.ts` (public: `/api/cron`, `/sw.js`, `/~offline`, `/manifest.webmanifest`, `/sitemap.xml`, `/robots.txt`), `.env.local(.example)` (`CRON_SECRET`), `.gitignore`, `DEPLOYMENT.md` (§14).

**Deviations (necessary):** `start_url`/dashboard links → `/boards` (no `/dashboard` route); **no landing-page JSON-LD** (Step 6's landing/pricing don't exist — `/` is the legacy localStorage app); sitemap lists `/`,`/sign-in`,`/sign-up` only (no `/pricing`); **React Compiler kept OFF** and **CSP kept Report-Only** (did NOT adopt the prompt's `next.config.ts` verbatim — it would have enabled an uninstalled babel plugin and an enforced CSP); **no PostHog `pwa_installed` event** (PostHog never wired). Serwist import path corrected (see A).

**Verified:** `tsc --noEmit` clean · `npm run build --webpack` clean (19 routes; `✓ (serwist) Bundling the service worker`; `public/sw.js` = 45 KB) · all **new** Phase 9 files `eslint`-clean. **NOT met:** repo-wide `eslint --max-warnings 0` (134 problems — all **pre-existing legacy** `react-hooks/*` in `board/`,`card/`,`list/`,`search-palette`,`store`; unchanged scope from Phase 7/8). **Cannot do here:** real PNG icons/screenshots/og-image, Resend domain verify + live email delivery, Vercel Cron execution, Lighthouse/installability, Search Console — all need assets/secrets/deploy.

## Phase 8 — Completed (2026-06-03): Stripe billing (scope: billing core, green build)

Scoped to **billing core** — PostHog analytics and the public landing page were deferred (context + missing keys).

**New files:** `src/lib/plans.ts` (PLANS limits/features, `getPlanLimit`/`isAtLimit`) · `src/lib/stripe.ts` (**lazy/guarded** `getStripe()` — no top-level construction, build-safe without a key; `apiVersion` omitted to avoid v22 type drift) · `src/lib/enforce-plan.ts` (`PlanLimitError`, `enforceBoardLimit`/`enforceMemberLimit`) · `src/features/billing/actions.ts` (`createCheckoutSession`, `createBillingPortalSession`, `getBillingInfo`) · `src/app/api/webhooks/stripe/route.ts` (raw-body signature verify, always-200, syncs sub state) · `src/components/settings/billing-tab.tsx`.
**Schema (db push, additive — NOT migrate dev):** `Workspace` += `stripeCustomerId?`/`stripeSubscriptionId?` (unique), `planName Plan @default(FREE)`, `planStatus`, `planCurrentPeriodEnd?`, `planCanceledAt?`; enum `Plan { FREE PRO BUSINESS }`.
**Modified:** `boards/actions.createBoard` + `workspaces/actions.inviteMember` enforce plan limits (throw `PlanLimitError`). `proxy.ts` — `/api/webhooks` is public (Stripe can't auth). Settings page/tabs — new **Billing tab**. `next.config.ts` CSP (Report-Only) — added Stripe + PostHog domains + `frame-src` for Stripe.
**Stack:** `stripe@22`, `@stripe/stripe-js`.

**Deferred (flagged):** PostHog (init/analytics/tracking across components), public landing page (`/` → landing, `/dashboard`, `/pricing`), sign-up `?plan=` intent + auto-checkout, upgrade-prompt in board-switcher (legacy component). The Stripe webhook uses `as unknown as { current_period_end }` casts (Stripe v22 moved these types).
**Cannot do here:** create Stripe products/keys, Stripe CLI, test checkout, webhook delivery, Vercel deploy, live smoke. `eslint --max-warnings 0` still not met (pre-existing legacy warnings from Phase 7).
**Verified:** `tsc` clean · `next build` clean (13 routes incl. `/api/webhooks/stripe`). Billing degrades gracefully without Stripe keys (plans default FREE; checkout throws a friendly error only when clicked).

## Phase 7 — Completed (2026-06-03): Production hardening (observability · security · perf · a11y)

Final phase, scoped to **green-build hardening** (no live deploy / Sentry wizard / missing-secret steps).

**New files:** `src/lib/{logger,sanitize,rate-limit,api-auth}.ts` · `src/instrumentation.ts` + `instrumentation-client.ts` + `sentry.{server,edge}.config.ts` · `src/app/error.tsx` + `src/app/board/[boardId]/error.tsx` + `loading.tsx` (board + boards) · `src/components/ui/loading-skeleton.tsx` · `src/app/api/boards/route.ts` (session + API-key dual auth) · `DEPLOYMENT.md`.
**Modified:** `next.config.ts` — `withSentryConfig` wrap, `images.remotePatterns` (utfs.io/ufs.sh/googleusercontent), HSTS, **CSP as `Report-Only`** (won't break Liveblocks/UploadThing/Sentry). `src/lib/db.ts` — connection pooling (`connection_limit=3&pool_timeout=10`, auto-appended). `error-boundary.tsx` — Sentry `captureException`. `notification-bell.tsx` — ARIA live region. Sanitisation wired into `cards` (title/description/comment), `boards`/`lists` (titles). Rate-limit wired into `auth.signUpUser` + `search` (guarded: rethrows on exceeded, swallows infra errors). `webhooks` delivery failures → `logger.error`. README replaced. CI: typecheck → lint → build → Sentry release.

**Stack:** `@sentry/nextjs@10`, `isomorphic-dompurify@3`, `@upstash/ratelimit@2`.

**Deliberately deferred (flagged):** React Compiler (needs `babel-plugin-react-compiler`); enforced CSP w/ nonces (currently Report-Only); `next/image` migration (raw `<img>` kept with eslint-disable — domains are configured); `eslint --max-warnings 0` (CI runs `eslint .` non-failing on warnings); AI-action rate-limit wiring (lib ready, same one-line pattern as search). **Wrong-target fixes skipped:** Step-7 keyboard-sensor fix targeted the legacy `board/dnd-context.tsx` (the real `db-board` uses Pointer-only sensors — no conflict). Skip-link already existed.

**Cannot be done here:** Vercel deploy to the live URL, live smoke tests, the interactive Sentry wizard, and verifying AI/upload/realtime (all need secrets/access I don't have).

**Verified:** `tsc` clean · `next build` clean (Sentry-wrapped, 12 routes incl. `/api/boards`).

> **7-phase handoff:**

## Phase 6 — Completed (2026-06-03): Attachments · checklists · covers · templates · list ops · move · archive

**New files:** `src/app/api/uploadthing/{core,route}.ts` (UploadThing v7 file router: card attachments + user avatar) · `src/lib/uploadthing.ts` (typed `UploadButton`) · `src/features/checklists/actions.ts` · `src/features/boards/template-defs.ts` (plain consts) + `templates.ts` (`createBoardFromTemplate`) · `src/features/lists/bulk-actions.ts` (`copyList`/`moveAllCards`/`sortCardsInList`) · `src/components/db-board/{archived-cards-drawer,templates-row}.tsx`.
**`cards/actions.ts` additions:** `deleteAttachment` (UTApi best-effort + DB delete), `setCardCover` (image URLs stored as `img:<url>`), `getBoardsForMoveDialog`, `moveCardToList`, `getArchivedCards`, `restoreCard`.
**Modified UI (the real `db-board` tree):** `db-card-modal.tsx` — cover bar + cover-colour picker + attachments (UploadButton/list/delete/"set as cover") + full checklists (progress/items/add/delete) + move-card popover. `db-board-view.tsx` — card **cover rendering** (`img:` + colour), per-list **Copy/Sort/Move-all/Delete menu**, **Archived** drawer in header. `boards/page.tsx` — **Templates** row. `settings-tabs.tsx` — avatar **UploadButton** in General.
**Schema:** unchanged (Attachment/Checklist/ChecklistItem already existed) → **no migration**.
**Stack:** `uploadthing@7.7`, `@uploadthing/react@7.3`.
**Deviations:** all UI wired into the real `db-board`/`/boards`/`/settings` (the prompt's Steps 9–14 targeted the legacy `board/`,`card/`,`list/`,`board-switcher` components, which aren't in the DB app). `BOARD_TEMPLATES` moved out of the `"use server"` file (only async exports allowed) into `template-defs.ts`. Skipped `@uploadthing/react/styles.css` import (doesn't exist in v7; styled via `appearance`). `update where:{id,workspaceId}` patterns avoided.
**Verified:** `tsc` clean · `next build` clean · authenticated `GET /boards` → 200 with Templates row. **NOT verified (needs `UPLOADTHING_TOKEN` + live clicks):** actual file uploads, set-image-cover round-trip, and the checklist/move/list-menu/archive UI interactions (all wired + typechecked).

> **5-phase handoff:** Phase 1 = Postgres/Prisma + Server Actions + routing (incremental; legacy localStorage app still at `/`, DB app at `/board/[id]`). Phase 2 = Auth.js v5 + workspaces/RBAC + invites. Phase 3 = DB-backed interactive board (`src/components/db-board/*`) + Liveblocks realtime. Phase 4 = activity log + notifications + tsvector search + Redis cache. Phase 5 = enterprise (audit/API keys/webhooks/export/settings) + Anthropic AI. **The real interactive product lives in `src/components/db-board/*` + `/board/[id]` + `/settings`, NOT the legacy `src/components/board|card/*` (those are the original localStorage `/` app).**

## Phase 5 — Completed (2026-06-03): Enterprise + AI

**New files:**
- `src/lib/ai.ts` — **lazy/guarded** Anthropic client (`getAI()` throws only when called without a key → build-safe) + `generateText` + `AI_MODEL`.
- `src/features/enterprise/audit.ts` — `recordAuditLog` (best-effort, captures IP/UA via async `headers()`), `getAuditLogs` (admin-only).
- `src/features/enterprise/api-keys.ts` — `createApiKey` (returns raw `tk_…` once; stores SHA-256 hash only), `listApiKeys`, `revokeApiKey`.
- `src/features/enterprise/webhooks.ts` — `createWebhook`/`list`/`delete` + `deliverWebhook` (HMAC-signed, 5s timeout, fire-and-forget).
- `src/features/enterprise/export.ts` — `exportBoardAsCSV`.
- `src/features/ai/actions.ts` — 5 AI actions (card description, board summary, task generation, standup, board chat); **each wrapped in try/catch returning `{ok:false}`**.
- `src/app/(workspace)/settings/page.tsx` + `settings-tabs.tsx` — 5-tab settings (General/Members/API Keys/Webhooks/Audit), built with existing tokens (no shadcn primitives exist).
- `src/components/db-board/ai-panel.tsx` — slide-in AI panel (Summary/Tasks/Standup/Chat).

**Schema (via `db push`, additive — not `migrate dev`, same data-safety reason as Phase 4):** `AuditLog`, `ApiKey`, `Webhook` + `Workspace`/`User` relations.

**Modified:**
- `workspaces/actions.ts` — `requireAdmin` + `removeMember` (audited).
- `cards/actions.ts` — `deliverWebhook` on card.created/deleted + comment.added. `boards/actions.ts` — `recordAuditLog` on board.deleted.
- `db-board/db-board-view.tsx` — header gets **Export CSV** button + **AI panel** (`firstListId = lists[0]?.id`).
- `db-board/db-card-modal.tsx` — **"Write with AI"** on the description.
- `top-bar.tsx` — **Settings** icon links to `/settings`.
- `.env.local(.example)` — `ANTHROPIC_API_KEY`.

**Stack:** `@anthropic-ai/sdk@0.100`, `uuid@14`.

**Deviations (necessary):** UI wired into the **real `db-board` components** (the prompt's Steps 8–10 targeted the legacy `board-header`/`description-editor`, which render outside the DB app and would be broken). Settings built with tokens (no shadcn Tabs/Table/Dialog exist). `db push` instead of `migrate dev` (data-safety). `update where:{id,workspaceId}` → `updateMany` (non-unique scope).

**Verified:** `tsc` clean · `next build` clean · enterprise tables live · authenticated `GET /settings` → 200 with all 5 tabs · CSV export action + audit/webhook wiring typecheck. **NOT verified (needs keys/live UI):** all AI features (no `ANTHROPIC_API_KEY` → actions return a graceful error), live webhook delivery, and the settings CRUD round-trips through the browser.

## Phase 4 — Completed (2026-06-03): Activity log · Notifications · Search · Redis cache

**New files:**
- `src/lib/redis.ts` — Upstash client (lazy/guarded: **null when unconfigured**, so the whole cache layer is a no-op and reads fall through to Postgres) + `cacheGet/cacheSet/cacheDel` + `CacheKeys`.
- `src/features/activity/actions.ts` — `recordActivity` (best-effort, never throws), `getCardActivity`, `getBoardActivity`.
- `src/features/notifications/actions.ts` — `createMentionNotification`, `getUnreadNotificationCount` (30s Redis cache), `getNotifications`, `markNotificationRead`/`markAllNotificationsRead`.
- `src/features/search/actions.ts` — `search()`: Postgres `tsquery` prefix search over Board.title + Card.title/description, workspace-scoped, `ts_rank` ordered.
- `src/components/ui/notification-bell.tsx` — bell + unread badge (polls 30s) + dropdown (mark read / mark all / navigate).
- `src/components/ui/search-palette.tsx` — Cmd/Ctrl+K palette, 250ms debounce, board+card results.

**Schema (via `db push`, additive — NOT `migrate dev`, see note):** `Activity` + `Notification` models; `Board.activities`, `Card.activities`, `User.activities`/`User.notifications` relations. Raw GIN FTS indexes `card_fts` / `board_fts` applied via `$executeRawUnsafe`.

**Modified:**
- `cards/actions.ts` — `recordActivity` + `cacheDel(board)` on create/update(per-field)/delete/move/comment/label; **@mention parsing** in `createComment` (regex `@name` → `User.findFirst` insensitive → `createMentionNotification`), wrapped in try/catch.
- `lists/actions.ts` — activity + cache bust on create/delete/reorder.
- `boards/actions.ts` — `getBoard`/`getBoards` now cache via `fetchBoard`/`fetchBoards`; cache bust on board + label mutations.
- `top-bar.tsx` — bell → `<NotificationBell/>`; mounts `<SearchPalette/>` (Cmd+K).
- `db-board/db-card-modal.tsx` — **activity feed** (merged chronological comments + activities via `getCardActivity`, human-readable system messages).
- `.env.local(.example)` — `UPSTASH_REDIS_REST_URL/TOKEN`.

**Stack:** `@upstash/redis`, `@upstash/ratelimit`.

**Deviations (necessary):** used **`db push`** not `prisma migrate dev` — the DB has no migration baseline (Phase 2 used push), so `migrate dev` would detect drift and risk **resetting real data**; push is additive. Activity feed wired into the **DB** card modal (`db-board/db-card-modal.tsx`), not the legacy `card/card-modal.tsx`/`activity-section.tsx` (those are the unused localStorage components). `createComment` mention code adapted to the real `{user, data.content}` shape (no `data.author`). NotificationBell/SearchPalette live in `top-bar` (the legacy `/` chrome); the DB board pages have a separate header — they don't show them yet.

**Verified:** `tsc` clean · `next build` clean · FTS search returns correct board/card matches · Activity/Notification tables live. **NOT verified (needs Upstash keys / live UI):** Redis cache-hit speedup (cache is a no-op until `UPSTASH_*` set), and the activity/mention/bell flows that require authenticated UI interaction.

## Phase 3 — Completed (2026-06-03): DB-backed interactive board + Liveblocks real-time

**Prerequisite built first** (Phase 1/2 never wired the board UI to the DB): a new **self-contained interactive board** at `/board/[boardId]`, kept separate from the 45 store-coupled legacy components so the localStorage `/` app is untouched and the build stays green.

**New files:**
- `src/components/db-board/db-board-view.tsx` — client board: optimistic state (`useState(board)`), dnd-kit drag (cards across/within lists → `moveCard`), add/delete card + list (`createCard`/`deleteCard`/`createList`/`deleteList`), opens the card modal; hosts presence/cursor/broadcast hooks.
- `src/components/db-board/db-card-modal.tsx` — fetches `getCardDetails`, edit description (`updateCard`), comments (`createComment`) with **live `COMMENT_ADDED` listener**.
- `src/components/db-board/board-room.tsx` — `RoomProvider` wrapper (room id = board id).
- `src/components/db-board/presence-avatars.tsx`, `live-cursors.tsx`.
- `src/lib/liveblocks.config.ts` — `createClient({ authEndpoint })` + `createRoomContext` (Presence/Storage/UserMeta/RoomEvent); exports hooks.
- `src/app/api/liveblocks-auth/route.ts` — auth endpoint; verifies the room (board) is in the user's workspace; mints a scoped session (lazy Liveblocks client → build-safe; returns 501 if no key).

**Modified:**
- `src/app/board/[boardId]/page.tsx` — now renders `<BoardRoom><DbBoardView board={board}/></BoardRoom>` (was read-only).
- `src/features/cards/actions.ts`, `lists/actions.ts` — lazy, try/catch Liveblocks **node broadcast** on create/delete card, comment, create/delete list (`CARD_CREATED`/`CARD_DELETED`/`COMMENT_ADDED`/`LIST_CREATED`/`LIST_DELETED`). `moveCard` is broadcast from the client.
- `.env.local(.example)` — `LIVEBLOCKS_SECRET_KEY`, `NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY`.

**Stack:** `@liveblocks/{client,react,node}@3.19.4`.

**Deviations from the Phase-3 prompt (necessary):** the prompt's Steps 5/6/8/10/11 edit the legacy `board-view`/`board-header`/`card-item`/`card-modal`/`lists-row` — but those are localStorage components rendered **outside any RoomProvider** (would crash) and lack the referenced props/functions. Real-time was instead built into the new `db-board` tree (all inside the room). Also dropped the conflicting `publicApiKey` (use `authEndpoint` only); list **drag-reorder** is not yet implemented (add/delete list works; card drag works).

**Verified:** `tsc` clean · `next build` clean · authenticated `GET /board/[id]` → 200 rendering seeded DB lists + interactive UI. **NOT verified (needs Liveblocks keys + 2 browsers):** presence avatars, live cursors, cross-tab card moves, live comments — these stay dormant (auth endpoint 501) until `LIVEBLOCKS_SECRET_KEY` is set; the board remains fully usable without it.

## Phase 2 — Completed (2026-06-02): Auth.js v5 + multi-user workspaces (CODE COMPLETE, build green)

Email/password + Google OAuth, per-user workspaces, board scoping, email invites, and auth-gated server actions. **Code written + `tsc`/`build` green; NOT yet run end-to-end** — `prisma migrate dev`, `prisma db seed`, and runtime auth need a real `DATABASE_URL` + the auth secrets (see deferred items).

**Stack added:** `next-auth@5.0.0-beta.31`, `@auth/prisma-adapter`, `bcryptjs`, `resend`.

**New files:**
- `src/lib/auth.ts` — Auth.js v5 (`handlers`/`auth`/`signIn`/`signOut`), Prisma adapter, JWT sessions, Google + Credentials; jwt/session callbacks attach `user.id` + `workspaceId`.
- `src/types/next-auth.d.ts` — Session + JWT augmentation (`id`, `workspaceId`).
- `src/app/api/auth/[...nextauth]/route.ts` — exports `GET`/`POST`.
- `src/proxy.ts` — Next 16 route guard (renamed middleware; **Node runtime**). Redirects unauthenticated → `/sign-in?callbackUrl=…`. Public: `/sign-in`, `/sign-up`, `/api/auth`.
- `src/features/auth/actions.ts` — `signUpUser` (hash + create user + personal workspace).
- `src/features/workspaces/actions.ts` — `getMyWorkspace`, `updateWorkspace`, `inviteMember` (Resend email; lazily constructed), `acceptInvitation`.
- `src/app/(auth)/sign-in/{page,sign-in-form}.tsx` — server page (awaits `searchParams`) + client form (Google + credentials).
- `src/app/(auth)/sign-up/page.tsx` — client form → `signUpUser` → `/sign-in?message=account-created`.
- `src/app/invite/[token]/page.tsx` — awaits `params`, gates to auth, calls `acceptInvitation`.
- `src/components/ui/session-provider.tsx` — client `SessionProvider` re-export.

**Modified:**
- `prisma/schema.prisma` — added `User`, `Session`, `Account`, `VerificationToken`, `Workspace`, `WorkspaceMember`, `BoardMember`, `Invitation`, enum `WorkspaceRole`. `Board` += `workspaceId?`/`createdById?` + relations + `members` + index. `Comment` `author` → `userId?` + `author @default("Anonymous")` + `user?` relation. **Deviation:** `User.cards`/`User.lists` from the spec were omitted (Card/List have no createdBy relation → would fail Prisma validation).
- `src/features/{boards,lists,cards}/actions.ts` — every action calls `requireAuth()` first; all mutations verify workspace ownership via the board chain; `getBoards` filters by `workspaceId` (`[]` if none); `createBoard` sets `workspaceId`+`createdById`; `createComment` takes `{cardId,content}` and derives `author`/`userId` from the session.
- `src/components/ui/top-bar.tsx` — avatar shows session user (image/initials), dropdown shows name/email, "Sign out" → `signOut()`.
- `src/app/layout.tsx` — wrapped in `SessionProvider`.
- `prisma/seed.ts` — creates demo user `demo@example.com` / `password123` + workspace (OWNER); boards scoped to it.
- `.env.local.example` — `AUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID/SECRET`, `RESEND_API_KEY`.

**Deviations from the prompt (for correctness):** `findFirst` instead of `findUnique` where `deletedAt` is combined (not a unique field); `auth.ts` not split for edge (proxy is Node runtime, so unnecessary); auth UI uses `SessionProvider`+client `signOut` rather than the stale Step-10 "TopBarUser server wrapper"; `board-switcher.tsx` left unchanged (it never had an `initialBoards` prop — Phase 1 was incremental); Resend client constructed lazily (build-safe).

**Deferred (need secrets/DB):** `prisma migrate dev --name add-auth-and-workspaces` (no migration created — only `prisma generate` run), `prisma db seed`, real Google OAuth, and end-to-end auth verification. The localStorage `/` app is now auth-gated by proxy but still uses localStorage (not workspace-scoped) — wiring it to the DB is a later batch.

## Phase 1 — Completed (2026-06-02): PostgreSQL + Prisma + Server Actions (INCREMENTAL)

Persistence backend stood up **alongside** the existing localStorage/Zustand app (incremental migration — the legacy app at `/` is untouched and still works). Component rewiring to the DB is deferred to later batches.

**ORM note:** Uses **Prisma 6.19.3** (pinned). `npm install prisma` pulls v7.8.0, whose schema format dropped `datasource.url` (requires `prisma.config.ts` + a driver adapter); v6 is pinned so the classic `schema.prisma` + `new PrismaClient()` setup in this phase works. Do not bump to v7 without migrating to the adapter API.

**New files:**
- `prisma/schema.prisma` — Board, List, Card, Label, CardLabel, Checklist, ChecklistItem, Comment, Attachment (UUID PKs, soft-delete via `deletedAt`, `Float` positions). **Labels are board-scoped here** (vs. the global label pool in the localStorage store — reconcile when wiring the modal).
- `prisma/seed.ts` — demo data (run via `npm run db:seed`).
- `src/lib/db.ts` — Prisma client singleton.
- `src/lib/position.ts` — fractional indexing (`initialPosition`/`positionBetween`/`recomputePositions`); drag moves ONE row.
- `src/features/boards/actions.ts` — `getBoards`, `getBoard`, `createBoard`, `updateBoard`, `deleteBoard`, `reorderBoards`, `upsertLabel`, `deleteLabel` (all `"use server"`).
- `src/features/lists/actions.ts` — `createList`, `updateList`, `deleteList`, `reorderLists`.
- `src/features/cards/actions.ts` — `createCard`, `updateCard`, `deleteCard`, `moveCard`, `reorderCardsInList`, `toggleCardLabel`, `createComment`, `deleteComment`, `getCardDetails`.
- `src/app/boards/page.tsx` — DB-backed board grid (Server Component, `force-dynamic`).
- `src/app/board/[boardId]/page.tsx` — DB-backed board view, **read-only for now** (awaits `params` per Next 16). Mutations come in a later batch.
- `.github/workflows/ci.yml` — install → prisma generate → tsc → build.
- `.env.local.example` — `DATABASE_URL` template.

**Modified:**
- `next.config.ts` — added top-level `turbopack: {}` and `experimental.serverActions.bodySizeLimit` (kept existing security headers).
- `package.json` — new scripts `db:generate` / `db:push` / `db:studio` / `db:seed` (use `dotenv-cli -e .env.local`) and `prisma.seed`; added `@prisma/client`, `prisma`, `zod`, `dotenv`, `dotenv-cli`, `tsx`.

**Not done (intentionally, per incremental plan):** Zustand store NOT replaced (still the full UI+data store; 45/48 components depend on it); the 12-component DB rewiring in the prompt's Step 9; replacing `/` with a server grid. These are follow-up batches.

**New npm scripts:** `db:generate`, `db:push`, `db:seed`, `db:studio`.
**Env needed:** `DATABASE_URL` (Neon Postgres) in `.env.local`.

## Stack
Next.js 16.2.6 · React 19.2.4 · TypeScript 5.9.3 · Tailwind CSS 4.3.0 · Zustand 5.0.14 · Immer 11.1.8 · @dnd-kit/{core 6.3.1, sortable 10.0.0, utilities 3.2.2} · shadcn 4.8.3 · lucide-react 1.17.0

## Folder Tree (`src/`, depth 3)
```
src/
├── app/
│   ├── globals.css          # Tailwind v4 @theme tokens, scrollbar, :focus-visible
│   ├── layout.tsx           # RootLayout, Inter, dark body
│   └── page.tsx             # Mounts <AppShell><BoardView/>
├── components/
│   ├── board/
│   │   ├── add-list-button.tsx
│   │   ├── board-header.tsx
│   │   ├── board-view.tsx
│   │   ├── dnd-context.tsx
│   │   └── lists-row.tsx
│   ├── card/
│   │   ├── activity-section.tsx
│   │   ├── card-badges.tsx
│   │   ├── card-item.tsx
│   │   ├── card-modal.tsx
│   │   ├── date-popover.tsx
│   │   ├── description-editor.tsx
│   │   └── label-popover.tsx
│   ├── list/
│   │   ├── list-column.tsx
│   │   ├── list-footer.tsx
│   │   ├── list-header.tsx
│   │   └── list-menu.tsx
│   └── ui/
│       ├── app-shell.tsx
│       ├── board-switcher.tsx
│       ├── button.tsx        # shadcn primitive
│       └── top-bar.tsx
├── lib/utils.ts              # shadcn cn() helper
├── store/use-board-store.ts
└── types/index.ts
```

## Store Action Signatures
```ts
// boards
createBoard(title: string, background: string): ID
renameBoard(id: ID, title: string): void
deleteBoard(id: ID): void
setActiveBoard(id: ID): void
// lists
createList(boardId: ID, title: string): ID
renameList(id: ID, title: string): void
deleteList(id: ID): void
reorderLists(boardId: ID, orderedIds: ID[]): void
// cards
createCard(listId: ID, title: string): ID
updateCard(id: ID, patch: Partial<Pick<Card,'title'|'description'|'dueDate'|'completed'|'labelIds'>>): void
deleteCard(id: ID): void
moveCard(cardId: ID, toListId: ID, toIndex: number): void
reorderCardsInList(listId: ID, orderedIds: ID[]): void
// labels
upsertLabel(label: Label): void
toggleCardLabel(cardId: ID, labelId: ID): void
// activity
pushActivity(cardId: ID, entry: Omit<ActivityEntry,'id'|'createdAt'>): void
// persistence
clearAll(): void
// exports: useBoardStore<T>(selector), useHasHydrated(), boardStore (plain)
```

## Component Inventory
| Path | Purpose |
|---|---|
| `board/board-view.tsx` | Resolves active board; renders BoardHeader + ListsRow; hydration skeleton |
| `board/board-header.tsx` | Editable board title, Star / Users / Share |
| `board/lists-row.tsx` | Wraps lists in BoardDndContext + horizontal SortableContext |
| `board/dnd-context.tsx` | PointerSensor (d=6) + KeyboardSensor; cross-list optimistic move; DragOverlay; a11y announcements |
| `board/add-list-button.tsx` | Collapsed pill ↔ expanded form; creates list on Enter |
| `list/list-column.tsx` | Memoised sortable column; vertical SortableContext; owns `addingCard` state |
| `list/list-header.tsx` | Editable title + MoreHorizontal menu trigger with outside-click guard |
| `list/list-menu.tsx` | Dropdown: Add card + Delete (functional); Copy/Move/Sort (visual stubs) |
| `list/list-footer.tsx` | "+ Add a card" ↔ autosize textarea; Enter keeps form open (Trello behaviour) |
| `card/card-item.tsx` | Memoised sortable card; label pills; CardBadges; pencil edit; mounts CardModal |
| `card/card-badges.tsx` | Due-date badge (overdue/soon/completed/normal), description icon, comment count |
| `card/card-modal.tsx` | Portal dialog; focus trap + restore; `aria-labelledby`; 2-col md+ layout |
| `card/description-editor.tsx` | Click-to-edit description; Save/Cancel |
| `card/activity-section.tsx` | Comment composer + reversed activity feed; custom `timeAgo` (no date-fns) |
| `card/label-popover.tsx` | Search, toggle labels, create with color-swatch grid |
| `card/date-popover.tsx` | Date + optional time; Save / Remove / Cancel |
| `ui/app-shell.tsx` | TopBar + `<main h-[calc(100vh-40px)]>` |
| `ui/top-bar.tsx` | 40px bar: logo, BoardSwitcher, search, Bell/Info/Settings(clearAll), avatar |
| `ui/board-switcher.tsx` | Popover: list + switch boards; create with 4-gradient + 2-solid swatches |

## Phases
**Completed (1–13):**
1. Type system 2. Zustand store + seed 3. App shell 4. Board canvas + switcher
5. ListColumn 6. CardItem + CardBadges 7. dnd-kit drag-and-drop
8. Card modal (description, activity, labels, dates) 9. Persistence hardening
10. Trello visual polish (Tailwind v4 @theme, 272px lists, shadow-card tokens)
11. Micro-polish (board backgrounds, board-header opacity, amber WCAG fix)
12. Render optimisation (React.memo, useShallow, narrow selectors)
13. Accessibility (ARIA, focus trap, Tab cycle, focus-visible, dnd announcements)

**Pending:**
- **14** — Code quality: ESLint clean pass, remove eslint-disable comments, extract shared colour maps to `src/lib/colors.ts`, add error boundaries
- **15** — Final review + README (setup, features, architecture, deploy)

## Known Issues / TODOs (phases 11–13)
- **`nanoid` missing from `package.json`** — run `npm install nanoid` (used in store + label-popover). `date-fns` was planned but replaced by a custom `timeAgo`; skip unless needed.
- **Keyboard drag vs. modal open** — dnd-kit KeyboardSensor intercepts Enter/Space on cards, starting a drag instead of opening the modal. Keyboard users must Tab to the pencil button. Fix: custom sensor activation key or `onKeyDown` composition in card-item.
- **Skip-to-board link missing** — specified in phase 13 but not wired. Add `<a href="#board-main">` (sr-only) in TopBar and `id="board-main"` on `<main>` in app-shell.
- **ListMenu stubs** — "Copy list", "Move all cards", "Sort by…" are no-ops.
- **`useEffect` lint suppression** — `card-modal.tsx:42` has `eslint-disable-line react-hooks/exhaustive-deps` on title-sync effect; should be rewritten with `useRef` comparison.
- **`@base-ui/react`** — auto-installed by shadcn; currently unused. Safe to remove.
- **`shadcn` in `dependencies`** — move to `devDependencies`.
- **Next.js 16** — `create-next-app@latest` installed v16 (not requested v15). AGENTS.md warns of breaking API changes; check `node_modules/next/dist/docs/` if unexpected behaviour occurs.
- **2 moderate PostCSS CVEs** — in Next.js's internal deps; the npm-suggested fix downgrades to Next 9. Monitor for upstream patch.
