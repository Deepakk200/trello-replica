// Reusable skeletons for Suspense boundaries (with ARIA busy/status).
export function BoardSkeleton() {
  return (
    <div className="flex gap-3 px-3 py-3" role="status" aria-label="Loading board…" aria-busy="true">
      {[1, 2, 3].map((i) => (
        <div key={i} className="w-[272px] flex-shrink-0 h-48 rounded-xl bg-white/10 animate-pulse" />
      ))}
      <span className="sr-only">Loading board content…</span>
    </div>
  );
}

export function BoardGridSkeleton() {
  return (
    <div className="p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3" role="status" aria-label="Loading boards…" aria-busy="true">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
      ))}
      <span className="sr-only">Loading boards…</span>
    </div>
  );
}
