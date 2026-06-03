"use client";

import { useOthers } from "@/lib/liveblocks.config";

export function LiveCursors() {
  const others = useOthers();

  return (
    <>
      {others
        .filter((o) => o.presence?.cursor != null)
        .map((other) => {
          const cursor = other.presence.cursor!;
          const info = other.info;
          const color = info?.color ?? "#0079BF";
          return (
            <div
              key={other.connectionId}
              className="pointer-events-none fixed z-50 transition-transform duration-75"
              style={{ left: cursor.x, top: cursor.y }}
            >
              <svg width="18" height="24" viewBox="0 0 18 24" fill="none">
                <path
                  d="M0 0L0 20L4.5 15.5L7 22L9 21L6.5 14H13L0 0Z"
                  fill={color}
                  stroke="white"
                  strokeWidth="1"
                />
              </svg>
              <span
                className="absolute top-5 left-3 text-xs text-white px-1.5 py-0.5 rounded whitespace-nowrap"
                style={{ background: color }}
              >
                {info?.name ?? "User"}
              </span>
            </div>
          );
        })}
    </>
  );
}
