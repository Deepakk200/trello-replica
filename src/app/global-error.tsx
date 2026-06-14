"use client";

// Root-level error boundary — catches errors thrown in the root layout itself
// (where app/error.tsx cannot). Must render its own <html>/<body>. Reports to
// Sentry, then offers recovery.
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { Sentry.captureException(error); }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#1D2125", color: "#B6C2CF", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 32, textAlign: "center" }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: "#fff", margin: 0 }}>Something went wrong</h2>
          <p style={{ fontSize: 14, maxWidth: 360 }}>
            An unexpected error occurred and our team has been notified.
            {error.digest ? ` (ref: ${error.digest})` : ""}
          </p>
          <button
            onClick={reset}
            style={{ background: "#579DFF", color: "#1D2125", fontSize: 14, padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
