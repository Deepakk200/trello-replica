// Environment validation (Phase 6 — production hardening).
//
// Reconciles two competing goals:
//  1. HARD RULE: fail fast on missing *required* env — no silent undefined.
//  2. The app's long-standing "build-safe / degrade-gracefully" design: optional
//     integrations (Sentry, Upstash, UploadThing, Stripe, Liveblocks, Google,
//     Anthropic, Resend) are lazily constructed and no-op when unset.
//
// So: in production runtime, the CORE vars (DB + auth) are hard-required (throw);
// optional integrations only emit a one-time warning. During `next build` and in
// local dev nothing is enforced (the env-free localStorage app must still run).
import { z } from "zod";
import { logger } from "@/lib/logger";

const coreSchema = z.object({
  DATABASE_URL: z.string().min(1, "required (Postgres connection string)"),
  AUTH_SECRET: z.string().min(1, "required (openssl rand -base64 32)"),
  NEXTAUTH_URL: z.string().url("must be a valid URL"),
});

// Optional integrations — present ⇒ feature on, absent ⇒ graceful no-op.
const OPTIONAL_INTEGRATIONS: Record<string, string> = {
  NEXT_PUBLIC_SENTRY_DSN: "error monitoring (Sentry)",
  UPSTASH_REDIS_REST_URL: "rate limiting + cache (Upstash)",
  LIVEBLOCKS_SECRET_KEY: "real-time collaboration (Liveblocks)",
  UPLOADTHING_TOKEN: "file attachments (UploadThing)",
  GOOGLE_CLIENT_ID: "Google sign-in",
  ANTHROPIC_API_KEY: "AI features (Anthropic)",
  RESEND_API_KEY: "transactional email (Resend)",
  STRIPE_SECRET_KEY: "billing (Stripe)",
};

let validated = false;

/**
 * Validate env at runtime boot. Throws in production if a CORE var is missing.
 * No-op during the build phase and in non-production (so build + the local
 * env-free app keep working). Safe to call multiple times.
 */
export function validateEnv(): void {
  if (validated) return;
  validated = true;

  // Never enforce during `next build` (no secrets present) or in dev/test.
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (process.env.NODE_ENV !== "production") return;

  const result = coreSchema.safeParse(process.env);
  if (!result.success) {
    const detail = result.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    // Fail fast with a clear, actionable message.
    throw new Error(`Invalid or missing required environment variables:\n${detail}`);
  }

  const missing = Object.entries(OPTIONAL_INTEGRATIONS)
    .filter(([key]) => !process.env[key])
    .map(([key, label]) => `${key} (${label})`);
  if (missing.length) {
    logger.warn("Optional integrations disabled (env not set)", { missing });
  }
}

/** Typed accessor for the core vars (call after validateEnv in prod). */
export const env = {
  DATABASE_URL: process.env.DATABASE_URL ?? "",
  AUTH_SECRET: process.env.AUTH_SECRET ?? "",
  NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "http://localhost:3000",
} as const;
