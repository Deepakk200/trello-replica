"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

/**
 * Shared per-route error boundary body. Async server failures (e.g. a DB read
 * that throws) render this instead of a white screen — a human message + Retry
 * (re-runs the segment) so the user is never stuck. Captured to Sentry.
 */
export function RouteError({
  reset,
  error,
  title = "Something went wrong",
  message = "We couldn't load this page. This is usually temporary — try again.",
}: {
  reset: () => void;
  error?: Error & { digest?: string };
  title?: string;
  message?: string;
}) {
  useEffect(() => { if (error) Sentry.captureException(error); }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 px-8 text-center">
      <div className="h-12 w-12 rounded-full bg-amber-500/15 flex items-center justify-center">
        <AlertTriangle className="h-6 w-6 text-amber-400" />
      </div>
      <div>
        <h2 className="text-base font-semibold text-trello-text mb-1">{title}</h2>
        <p className="text-sm text-trello-textSubtle max-w-sm">{message}</p>
      </div>
      <button onClick={reset} className="bg-trello-primary text-trello-textOnBold text-sm font-medium px-4 py-2 rounded-lg hover:brightness-110 transition">
        Try again
      </button>
    </div>
  );
}
