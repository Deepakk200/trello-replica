"use client";

import { RouteError } from "@/components/ui/route-error";

export default function TemplatesError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteError
      error={error}
      reset={reset}
      title="Couldn't load templates"
      message="We hit a problem loading the template gallery. Try again in a moment."
    />
  );
}
