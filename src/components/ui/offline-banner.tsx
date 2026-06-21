"use client";

import { useEffect, useRef, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";

/**
 * Non-blocking connectivity banner. Shows "You're offline — changes will retry"
 * while offline, then a brief "Back online — syncing" confirmation on reconnect
 * (the DB sync flushes queued changes via its own `online` listener).
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const [reconnected, setReconnected] = useState(false);
  const wasOffline = useRef(false);

  useEffect(() => {
    function sync() {
      const isOffline = !navigator.onLine;
      setOffline(isOffline);
      if (!isOffline && wasOffline.current) {
        setReconnected(true);
        setTimeout(() => setReconnected(false), 2500);
      }
      wasOffline.current = isOffline;
    }
    window.addEventListener("offline", sync);
    window.addEventListener("online", sync);
    const id = setTimeout(sync, 0);
    return () => {
      clearTimeout(id);
      window.removeEventListener("offline", sync);
      window.removeEventListener("online", sync);
    };
  }, []);

  if (!offline && !reconnected) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 text-xs font-medium py-1.5 px-4 flex items-center justify-center gap-2 ${
        offline ? "bg-amber-500 text-amber-950" : "bg-emerald-500 text-emerald-950"
      }`}
      role="status"
      aria-live={offline ? "assertive" : "polite"}
    >
      {offline ? (
        <><WifiOff size={12} /> You&apos;re offline — changes will sync when reconnected</>
      ) : (
        <><Wifi size={12} /> Back online — syncing your changes</>
      )}
    </div>
  );
}
