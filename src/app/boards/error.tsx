"use client";

import { RouteError } from "@/components/ui/route-error";

export default function BoardsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteError
      error={error}
      reset={reset}
      title="Couldn't load your boards"
      message="We hit a problem fetching your boards. This is usually temporary — try again."
    />
  );
}
