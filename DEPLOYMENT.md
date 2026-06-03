# Production Deployment Checklist

Complete these in order before going live.

## 1. Neon Database
- [ ] Production database created (not the dev branch)
- [ ] `DATABASE_URL` points to the production pooled connection string
- [ ] `npx prisma migrate deploy` (or `db push` for this project's no-migration setup)
- [ ] Seed data removed/replaced with real data
- [ ] `connection_limit=3&pool_timeout=10` applied (auto-appended by `src/lib/db.ts`)

## 2. Auth.js
- [ ] `AUTH_SECRET` is a 32-byte random string (`openssl rand -base64 32`)
- [ ] `NEXTAUTH_URL` (or `AUTH_URL`) set to the production domain
- [ ] Google OAuth redirect URI added: `https://<domain>/api/auth/callback/google`
- [ ] Google OAuth app published (not in testing mode)
- [ ] ⚠ Google-first sign-ins currently get no workspace — add a create-workspace hook before relying on OAuth

## 3. Liveblocks
- [ ] Production project; `LIVEBLOCKS_SECRET_KEY` set
- [ ] `NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY` matches (or omit — auth endpoint is used)

## 4. UploadThing
- [ ] `UPLOADTHING_TOKEN` from a production app; storage quota reviewed

## 5. Upstash Redis
- [ ] Production DB; `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` set
- [ ] Enables cache + rate limiting (both are no-ops when unset)

## 6. Sentry
- [ ] `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` set
- [ ] Source maps upload verified; alert rules configured

## 7. Resend
- [ ] Domain verified (or `onboarding@resend.dev` for testing); limits reviewed

## 8. Anthropic
- [ ] Production `ANTHROPIC_API_KEY`; usage limits set to cap cost

## 9. Vercel
- [ ] All env vars added (Settings → Environment Variables, Production)
- [ ] Production branch = `main`; custom domain (optional)

## 10. GitHub Actions
- [ ] All secrets added (Settings → Secrets → Actions)
- [ ] CI green on `main`

## 11. Final checks
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes with production env
- [ ] Sign up / Google OAuth / file upload / realtime (two tabs) / AI / notifications / Cmd+K search all work
- [ ] CSP: currently `Content-Security-Policy-Report-Only` — review reports, then switch to enforced with nonces

## 12. Stripe (Phase 8)
- [ ] Switch test keys (`sk_test_`/`pk_test_`) → live keys in Vercel
- [ ] Create live products (Pro $9/mo, Business $19/mo); update `STRIPE_PRO_PRICE_ID` / `STRIPE_BUSINESS_PRICE_ID`
- [ ] Create production webhook endpoint → `https://<domain>/api/webhooks/stripe` (events: `checkout.session.completed`, `customer.subscription.{created,updated,deleted}`, `invoice.payment_{succeeded,failed}`); set `STRIPE_WEBHOOK_SECRET`
- [ ] Enable the Stripe Customer Portal (Settings → Billing → Customer portal)
- [ ] Test: Free → Pro checkout (`4242 4242 4242 4242`) → cancel → webhook downgrades to Free
- [ ] Verify webhook deliveries in Stripe → Developers → Webhooks → Events
- [ ] Do NOT set `STRIPE_WEBHOOK_SECRET_LOCAL` in production (local CLI only)
- [ ] Test cards: `4242…4242` (ok), `4000…0002` (declined), `4000 0025 0000 3155` (3DS)

## 13. PostHog (deferred — not yet wired)
- [ ] PostHog analytics was scoped out of this billing pass; wire it in a follow-up

## Security notes
- CSP ships as **Report-Only** so it can't break Liveblocks/UploadThing/Sentry. Tighten to enforced + nonces after reviewing reports.
- Rate limiting + cache require Upstash; both degrade to no-ops without it.
- All user free-text (card title/description/comment, board/list titles) is sanitised server-side via `src/lib/sanitize.ts`.
