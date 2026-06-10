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

// Content-Security-Policy is shipped as Report-Only for now so it cannot break
// Liveblocks (WSS), UploadThing, Sentry, or Next inline scripts. Tighten to an
// enforced policy with nonces in a future production-hardening pass.
// TODO(prod-hardening): move to enforced CSP + drop 'unsafe-inline'/'unsafe-eval' via nonces.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://utfs.io https://*.ufs.sh https://lh3.googleusercontent.com https://*.googleusercontent.com",
  "connect-src 'self' wss://*.liveblocks.io https://*.liveblocks.io https://*.ingest.sentry.io https://*.uploadthing.com https://*.ufs.sh https://utfs.io https://api.stripe.com https://*.posthog.com https://us.i.posthog.com",
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
  "frame-ancestors 'self'",
].join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "Content-Security-Policy-Report-Only", value: csp },
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
