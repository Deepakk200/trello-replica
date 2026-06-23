export default function AccountLoading() {
  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#1D2125' }}>
      <div className="h-11 border-b border-white/[0.08] shrink-0" style={{ background: '#1D2125' }} />
      <main className="flex-1 overflow-y-auto px-6 py-10">
        <div className="max-w-2xl mx-auto animate-pulse">
          <div className="h-4 w-32 bg-white/10 rounded mb-6" />
          <div className="h-7 w-64 bg-white/10 rounded mb-3" />
          <div className="h-4 w-80 bg-white/[0.06] rounded mb-8" />
          <div className="flex flex-col gap-3">
            <div className="h-16 bg-white/[0.04] rounded-xl" />
            <div className="h-16 bg-white/[0.04] rounded-xl" />
            <div className="h-16 bg-white/[0.04] rounded-xl" />
          </div>
        </div>
      </main>
    </div>
  );
}
