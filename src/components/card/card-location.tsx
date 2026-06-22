'use client';

import { useState } from 'react';
import { MapPin, Trash2 } from 'lucide-react';
import { useBoardStore } from '@/store/use-board-store';
import type { ID } from '@/types';

/**
 * Card Location editor — address + optional coordinates for the Map view. No
 * geocoding API is wired (CSP doesn't allow one), so coordinates are entered
 * manually; a card needs lat/lng to appear as a pin on the map.
 */
export function CardLocationSection({ cardId }: { cardId: ID }) {
  const location = useBoardStore((s) => s.cards[cardId]?.location ?? null);
  const setCardLocation = useBoardStore((s) => s.setCardLocation);

  const [open, setOpen] = useState(false);
  const [address, setAddress] = useState(location?.address ?? '');
  const [lat, setLat] = useState(location?.lat !== undefined ? String(location.lat) : '');
  const [lng, setLng] = useState(location?.lng !== undefined ? String(location.lng) : '');

  function save() {
    if (!address.trim()) return;
    const latN = lat.trim() === '' ? undefined : Number(lat);
    const lngN = lng.trim() === '' ? undefined : Number(lng);
    setCardLocation(cardId, {
      address: address.trim(),
      ...(latN !== undefined && !Number.isNaN(latN) ? { lat: latN } : {}),
      ...(lngN !== undefined && !Number.isNaN(lngN) ? { lng: lngN } : {}),
    });
    setOpen(false);
  }

  function remove() {
    setCardLocation(cardId, null);
    setAddress(''); setLat(''); setLng('');
    setOpen(false);
  }

  const inputCls = 'w-full bg-trello-cardBg border border-trello-borderSubtle focus:border-trello-accent rounded px-2 py-1.5 text-sm text-trello-text outline-none transition-colors';

  if (!open) {
    return (
      <div>
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-trello-textSubtle mb-2">
          <MapPin className="w-3.5 h-3.5" /> Location
        </p>
        {location ? (
          <button onClick={() => setOpen(true)} className="text-left bg-trello-cardBg hover:bg-trello-cardHover rounded px-3 py-2 w-full transition-colors">
            <span className="text-sm text-trello-text block truncate">{location.address}</span>
            <span className="text-[11px] text-trello-textSubtle">
              {typeof location.lat === 'number' && typeof location.lng === 'number'
                ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)} — shown on the Map view`
                : 'No coordinates — add lat/lng to plot on the map'}
            </span>
          </button>
        ) : (
          <button onClick={() => setOpen(true)} className="btn-soft text-xs px-3 py-1.5">Add location</button>
        )}
      </div>
    );
  }

  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-trello-textSubtle mb-2">
        <MapPin className="w-3.5 h-3.5" /> Location
      </p>
      <div className="flex flex-col gap-2">
        <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address or place name" className={inputCls} autoFocus />
        <div className="flex gap-2">
          <input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="Latitude" inputMode="decimal" className={inputCls} />
          <input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="Longitude" inputMode="decimal" className={inputCls} />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={save} disabled={!address.trim()} className="btn-primary text-xs px-3 py-1.5 disabled:opacity-40">Save</button>
          <button onClick={() => setOpen(false)} className="btn-ghost text-xs px-3 py-1.5 text-trello-textSubtle">Cancel</button>
          {location && (
            <button onClick={remove} className="ml-auto inline-flex items-center gap-1 text-xs text-trello-danger hover:underline">
              <Trash2 className="w-3.5 h-3.5" /> Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
