# Trello Clone

A production-grade Trello replica built with Next.js 16, Prisma, and Liveblocks.

[Live Demo](https://trello-replica-one.vercel.app) · demo login: `demo@example.com` / `password123`

## Features

- **Boards, Lists, Cards** — drag-and-drop with fractional position ordering
- **Real-time collaboration** — live cursors, presence avatars, instant updates (Liveblocks)
- **Authentication** — email/password + Google OAuth (Auth.js v5)
- **Workspaces** — OWNER / ADMIN / MEMBER / GUEST roles, email invites
- **Checklists** — per-card with progress tracking
- **File attachments + covers** — images/docs via UploadThing; color or image covers
- **Board templates** — Kanban, Sprint, Bug Tracker, Project Roadmap
- **Activity log + notifications** — per-card/board audit + @mention bell
- **Cmd+K search** — full-text across boards/cards (Postgres tsvector)
- **AI features** — board summary, task generation, standup, board chat (Claude)
- **Enterprise** — CSV export, API keys, webhooks (HMAC), admin audit log
- **Production hardening** — Sentry, security headers, rate limiting, XSS sanitisation

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16.2, React 19.2, Tailwind CSS v4 |
| State | Zustand 5 (UI only) + Server Actions |
| Database | PostgreSQL (Neon) via Prisma 6 |
| Auth | Auth.js v5 — Google + Credentials |
| Realtime | Liveblocks |
| Files | UploadThing |
| Cache / Rate limit | Upstash Redis |
| AI | Anthropic Claude API |
| Email | Resend |
| Monitoring | Sentry |
| Deployment | Vercel |

## Architecture note (important for new engineers)

This project was built incrementally. The **interactive, DB-backed product lives in
`src/components/db-board/*`, served at `/board/[boardId]` and `/boards`**, plus `/settings`.
The original `src/components/{board,card,list}/*` + `/` are a **legacy localStorage prototype**
kept alongside; new work targets the `db-board` tree. All data mutations go through
`src/features/**/actions.ts` (`"use server"`), each gated by `requireAuth()`.

## Local Setup

```bash
git clone https://github.com/Deepakk200/trello-replica
cd trello-replica
npm install
cp .env.local.example .env.local   # fill in the variables below
npm run db:push
npm run db:seed
npm run dev
```

Open http://localhost:3000 (legacy app) or http://localhost:3000/boards (DB app).

## Environment Variables

```
DATABASE_URL=                          # Neon (neon.tech)
AUTH_SECRET=                           # openssl rand -base64 32
NEXTAUTH_URL=                          # http://localhost:3000 (prod: your domain)
GOOGLE_CLIENT_ID= / GOOGLE_CLIENT_SECRET=
LIVEBLOCKS_SECRET_KEY= / NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY=
UPLOADTHING_TOKEN=                     # uploadthing.com
UPSTASH_REDIS_REST_URL= / UPSTASH_REDIS_REST_TOKEN=   # console.upstash.com (cache + rate limit)
ANTHROPIC_API_KEY=                     # console.anthropic.com
RESEND_API_KEY=                        # resend.com (workspace invites)
NEXT_PUBLIC_SENTRY_DSN= / SENTRY_ORG= / SENTRY_PROJECT= / SENTRY_AUTH_TOKEN=
```

Every integration **degrades gracefully** when its key is absent (cache/rate-limit no-op,
AI/upload/realtime/Sentry inert) — the core board app still runs.

## Scripts

```bash
npm run dev        # dev server
npm run build      # production build (Sentry-wrapped)
npm run db:push    # apply schema (no migration history)
npm run db:seed    # demo data
npm run db:studio  # Prisma Studio
npx tsc --noEmit   # typecheck
npx eslint .       # lint
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md). CI (`.github/workflows/ci.yml`) runs
typecheck → lint → build → Sentry release on every push.
