import * as Sentry from "@sentry/nextjs";

const enabled =
  process.env.NODE_ENV === "production" && !!process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  // Replay is the single heaviest part of the browser SDK. Statically importing
  // `replayIntegration` pulled it into the shared first-load JS that EVERY route
  // pays for. We lazy-load it (below) so webpack tree-shakes the Replay code out
  // of the initial bundle; it's fetched on demand only when Sentry is actually
  // enabled (production + DSN). Perf win with no loss of replay coverage.
  integrations: [],
  enabled,
});

// Lazy-load Session Replay out of the critical-path bundle. Best-effort: never
// block the app on it. Only runs in the browser when Sentry is enabled.
if (enabled && typeof window !== "undefined") {
  Sentry.lazyLoadIntegration("replayIntegration")
    .then((replayIntegration) => {
      Sentry.addIntegration(
        replayIntegration({ maskAllText: false, blockAllMedia: false }),
      );
    })
    .catch(() => {
      /* replay is non-essential; ignore load failures */
    });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
