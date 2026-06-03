"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  useEffect(() => { Sentry.captureException(error); }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8 bg-trello-bg">
      <h2 className="text-lg font-semibold text-trello-text">Something went wrong</h2>
      <p className="text-sm text-trello-textSubtle max-w-sm text-center">
        An unexpected error occurred. Our team has been notified.
      </p>
      <div className="flex gap-3">
        <button onClick={reset} className="bg-trello-primary text-trello-textOnBold text-sm px-4 py-2 rounded-lg">Try again</button>
        <button onClick={() => router.push("/")} className="bg-trello-cardHover text-trello-text text-sm px-4 py-2 rounded-lg">Go home</button>
      </div>
    </div>
  );
}
