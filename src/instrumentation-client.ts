import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false })],
  // Only send events in production (and only when a DSN is configured).
  enabled: process.env.NODE_ENV === "production" && !!process.env.NEXT_PUBLIC_SENTRY_DSN,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
