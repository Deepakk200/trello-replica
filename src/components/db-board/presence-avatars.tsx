"use client";

import { useOthers, useSelf } from "@/lib/liveblocks.config";

export function PresenceAvatars() {
  const others = useOthers();
  const self = useSelf();

  const all = [
    ...(self ? [{ id: String(self.id ?? "me"), info: self.info, isMe: true }] : []),
    ...others.map((o) => ({ id: String(o.id ?? o.connectionId), info: o.info, isMe: false })),
  ].slice(0, 6);

  if (all.length === 0) return null;

  return (
    <div className="flex items-center -space-x-2">
      {all.map(({ id, info, isMe }) => (
        <div
          key={id}
          title={isMe ? `${info?.name ?? "You"} (you)` : info?.name ?? "User"}
          className="relative w-7 h-7 rounded-full border-2 border-trello-bg overflow-hidden flex items-center justify-center text-xs font-bold text-white"
          style={{ background: info?.color ?? "#0079BF" }}
        >
          {info?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={info.avatarUrl} alt={info.name} className="w-full h-full object-cover" />
          ) : (
            (info?.name?.[0] ?? "?").toUpperCase()
          )}
        </div>
      ))}
      {others.length > 5 && (
        <div className="w-7 h-7 rounded-full border-2 border-trello-bg bg-trello-cardHover flex items-center justify-center text-xs text-trello-text">
          +{others.length - 5}
        </div>
      )}
    </div>
  );
}
