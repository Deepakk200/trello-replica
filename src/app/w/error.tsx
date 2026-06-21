"use client";

import { RouteError } from "@/components/ui/route-error";

export default function WorkspaceError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteError
      error={error}
      reset={reset}
      title="Couldn't load this workspace page"
      message="We hit a problem loading workspace data. This is usually temporary — try again."
    />
  );
}
