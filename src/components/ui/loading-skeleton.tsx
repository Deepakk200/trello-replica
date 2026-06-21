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

export function SettingsSkeleton() {
  return (
    <div className="max-w-3xl mx-auto p-6" role="status" aria-label="Loading settings…" aria-busy="true">
      <div className="h-7 w-48 rounded bg-white/10 animate-pulse mb-6" />
      <div className="flex gap-2 mb-6">
        {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-8 w-24 rounded-md bg-white/10 animate-pulse" />)}
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-lg bg-white/5 animate-pulse" />)}
      </div>
      <span className="sr-only">Loading settings…</span>
    </div>
  );
}

export function TemplatesGallerySkeleton() {
  return (
    <div className="p-6" role="status" aria-label="Loading templates…" aria-busy="true">
      <div className="h-8 w-64 rounded bg-white/10 animate-pulse mb-6" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-40 rounded-xl bg-white/5 animate-pulse" />
        ))}
      </div>
      <span className="sr-only">Loading templates…</span>
    </div>
  );
}
