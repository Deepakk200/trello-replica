'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Map as LeafletMap, Marker } from 'leaflet';
import { useShallow } from 'zustand/shallow';
import { MapPin } from 'lucide-react';
import { useBoardStore } from '@/store/use-board-store';
import { CardModal } from '@/components/card/card-modal';
import { EmptyState } from '@/components/ui/empty-state';
import type { Card, ID } from '@/types';

/**
 * Map view — plots cards that have coordinates on an OpenStreetMap (bundled
 * Leaflet, so no external script; only the tile origin is added to the CSP).
 * Click a pin to open the card. Cards with an address but no lat/lng are listed
 * in an "Unmapped" panel (no geocoding API is wired — coords are entered in the
 * card's Location section). Uses `divIcon` markers to avoid Leaflet's
 * bundler-broken default marker images.
 */
function hasCoords(c: Card): c is Card & { location: { address: string; lat: number; lng: number } } {
  return typeof c.location?.lat === 'number' && typeof c.location?.lng === 'number';
}

export function MapView({ boardId }: { boardId: ID }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const [ready, setReady] = useState(false);
  const [modalCardId, setModalCardId] = useState<ID | null>(null);

  const cards = useBoardStore(
    useShallow((s) => {
      const board = s.boards[boardId];
      if (!board) return [] as Card[];
      const out: Card[] = [];
      for (const lid of board.listIds) {
        const list = s.lists[lid];
        if (!list || list.isArchived) continue;
        for (const cid of list.cardIds) {
          const c = s.cards[cid];
          if (c && !c.isArchived && c.location) out.push(c);
        }
      }
      return out;
    }),
  );

  const located = useMemo(() => cards.filter(hasCoords), [cards]);
  const unmapped = useMemo(() => cards.filter((c) => !hasCoords(c)), [cards]);

  // Initialise the Leaflet map once (client-only; dynamic import so `window` is safe).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const L = await import('leaflet');
      if (cancelled || !containerRef.current || mapRef.current) return;
      const map = L.map(containerRef.current, { center: [20, 0], zoom: 2, scrollWheelZoom: true, worldCopyJump: true });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);
      mapRef.current = map;
      setTimeout(() => map.invalidateSize(), 0);
      setReady(true);
    })();
    return () => { cancelled = true; mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  // (Re)draw markers whenever the located set changes (after the map is ready).
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    void (async () => {
      const L = await import('leaflet');
      const map = mapRef.current;
      if (!map || cancelled) return;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      const pts: [number, number][] = [];
      for (const c of located) {
        const color = c.cover.type === 'color' && c.cover.color ? c.cover.color : '#579DFF';
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:18px;height:18px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.5)"></div>`,
          iconSize: [18, 18],
          iconAnchor: [9, 18],
        });
        const marker = L.marker([c.location.lat, c.location.lng], { icon }).addTo(map);
        marker.bindTooltip(c.title, { direction: 'top', offset: [0, -14] });
        marker.on('click', () => setModalCardId(c.id));
        markersRef.current.push(marker);
        pts.push([c.location.lat, c.location.lng]);
      }
      if (pts.length) map.fitBounds(pts, { padding: [48, 48], maxZoom: 14 });
    })();
    return () => { cancelled = true; };
  }, [located, ready]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 min-h-0 flex gap-3">
        {/* Map */}
        <div className="flex-1 min-w-0 rounded-lg overflow-hidden border border-trello-borderSubtle relative">
          <div ref={containerRef} className="absolute inset-0" />
          {located.length === 0 && (
            <div className="absolute inset-0 z-[500] flex items-center justify-center bg-trello-surface/70 backdrop-blur-sm pointer-events-none">
              <EmptyState
                title="No mapped cards"
                subtitle="Add a location with coordinates to a card (in the card's Location section) and it'll appear here."
              />
            </div>
          )}
        </div>

        {/* Unmapped panel */}
        {unmapped.length > 0 && (
          <div className="hidden lg:flex w-64 shrink-0 flex-col rounded-lg border border-trello-borderSubtle bg-trello-surface p-3 overflow-y-auto cards-scroll">
            <p className="text-xs font-semibold uppercase tracking-wide text-trello-textSubtle mb-2">
              Unmapped ({unmapped.length})
            </p>
            <p className="text-[11px] text-trello-textSubtle mb-2">These cards have an address but no coordinates — add lat/lng in the card to plot them.</p>
            <div className="flex flex-col gap-1.5">
              {unmapped.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setModalCardId(c.id)}
                  className="text-left bg-trello-cardBg hover:bg-trello-cardHover rounded px-2.5 py-1.5 transition-colors"
                >
                  <span className="text-sm text-trello-text line-clamp-1">{c.title}</span>
                  <span className="flex items-center gap-1 text-[11px] text-trello-textSubtle mt-0.5">
                    <MapPin className="w-3 h-3 shrink-0" /> <span className="truncate">{c.location?.address}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {modalCardId && <CardModal cardId={modalCardId} onClose={() => setModalCardId(null)} />}
    </div>
  );
}
