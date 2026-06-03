"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function BoardError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { Sentry.captureException(error); }, [error]);

  return (
    <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
      <p className="text-trello-textSubtle">Failed to load board.</p>
      <button onClick={reset} className="bg-trello-primary text-trello-textOnBold text-sm px-4 py-2 rounded-lg">Retry</button>
    </div>
  );
}
