import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// Next.js 16: route guards live in proxy.ts (renamed from middleware.ts) and run
// on the Node.js runtime — so importing the full Auth.js config (Prisma/bcrypt) is fine.

// /api/webhooks is public — Stripe cannot authenticate through the auth guard.
// /api/cron is public — Vercel Cron calls it directly (it self-checks CRON_SECRET).
// The PWA/SEO assets must be reachable without a session (crawlers, the SW, manifest).
const PUBLIC_PREFIXES = [
  "/welcome", // public marketing landing (logged-out visitors)
  "/sign-in",
  "/sign-up",
  "/api/auth",
  "/api/webhooks",
  "/api/cron",
  "/sw.js",
  "/~offline",
  "/manifest.webmanifest",
  "/sitemap.xml",
  "/robots.txt",
];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (!req.auth) {
    const url = req.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:png|svg|ico)$).*)",
  ],
};
