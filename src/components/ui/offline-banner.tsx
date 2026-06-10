"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);

    window.addEventListener("offline", sync);
    window.addEventListener("online", sync);
    // Initial sync deferred to a callback (not the synchronous effect body) so the
    // first client render matches the server and we avoid a cascading render.
    const id = setTimeout(sync, 0);

    return () => {
      clearTimeout(id);
      window.removeEventListener("offline", sync);
      window.removeEventListener("online", sync);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-amber-950
                 text-xs font-medium py-1.5 px-4 flex items-center
                 justify-center gap-2"
      role="status"
      aria-live="assertive"
    >
      <WifiOff size={12} />
      You&apos;re offline — changes will sync when reconnected
    </div>
  );
}
