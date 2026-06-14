import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import withSerwistInit from "@serwist/next";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";

// Cache-busting revision for the precached offline page — derived from the
// current git commit, falling back to a random UUID when git is unavailable.
const revision =
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ||
  randomUUID();

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // Precache the offline page so it's available without network.
  additionalPrecacheEntries: [{ url: "/~offline", revision }],
  // Serwist requires Webpack; disable everywhere except production builds
  // (dev uses Turbopack, which Serwist does not support).
  disable: process.env.NODE_ENV !== "production",
  cacheOnNavigation: true,
  reloadOnOnline: true,
});

// Enforced Content-Security-Policy (Phase 6). 'unsafe-inline'/'unsafe-eval' are
// retained in script-src because Next.js injects inline bootstrap scripts and
// some deps eval at runtime — removing them needs a nonce/hash pipeline (future
// pass). Every external origin the app talks to is explicitly allowlisted so the
// enforced policy does NOT break Liveblocks (WSS), UploadThing, Sentry (incl.
// replay web-worker via blob:), Stripe, Google fonts/avatars, or the PWA SW.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://utfs.io https://*.ufs.sh https://lh3.googleusercontent.com https://*.googleusercontent.com",
  "connect-src 'self' wss://*.liveblocks.io https://*.liveblocks.io https://*.ingest.sentry.io https://*.uploadthing.com https://*.ufs.sh https://utfs.io https://api.stripe.com https://*.posthog.com https://us.i.posthog.com",
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig: NextConfig = {
  turbopack: {},
  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
    // NOTE: React Compiler intentionally NOT enabled — it requires
    // babel-plugin-react-compiler which is not installed. Enable in a perf pass.
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "utfs.io" },
      { protocol: "https", hostname: "*.ufs.sh" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

// Wrap order: Serwist outermost, Sentry inner.
export default withSerwist(
  withSentryConfig(nextConfig, {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    silent: !process.env.CI,
    widenClientFileUpload: true,
  })
);
