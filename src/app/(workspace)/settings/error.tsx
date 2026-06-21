"use client";

import { RouteError } from "@/components/ui/route-error";

export default function SettingsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteError
      error={error}
      reset={reset}
      title="Couldn't load settings"
      message="We hit a problem loading your workspace settings. Try again in a moment."
    />
  );
}
