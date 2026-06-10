// This page is served by the service worker when the user is offline
// and navigates to a page that wasn't cached.
// It is statically generated — no server-side data required.

export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <div
      className="min-h-screen bg-[#1D2125] flex flex-col items-center
                 justify-center gap-6 p-8 text-center"
    >
      {/* SVG illustration — a disconnected board */}
      <svg
        width="120"
        height="120"
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect width="120" height="120" rx="16" fill="#282E33" />
        <rect x="16" y="24" width="36" height="72" rx="6" fill="#384048" />
        <rect x="60" y="24" width="36" height="48" rx="6" fill="#384048" />
        <line x1="60" y1="10" x2="100" y2="50" stroke="#E2483D" strokeWidth="3"
              strokeLinecap="round" />
        <line x1="100" y1="10" x2="60" y2="50" stroke="#E2483D" strokeWidth="3"
              strokeLinecap="round" />
      </svg>

      <div>
        <h1 className="text-xl font-semibold text-white mb-2">
          You&apos;re offline
        </h1>
        <p className="text-sm text-[#9FADBC] max-w-xs">
          It looks like you&apos;ve lost your internet connection.
          Previously visited boards are still available.
        </p>
      </div>

      <a
        href="/boards"
        className="bg-[#0052CC] hover:bg-[#0065FF] text-white text-sm
                   font-medium px-6 py-2.5 rounded-lg transition-colors"
      >
        Try again
      </a>

      <p className="text-xs text-[#626F7A]">
        Boards you&apos;ve recently visited are cached and accessible offline.
      </p>
    </div>
  );
}
