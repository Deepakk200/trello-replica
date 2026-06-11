'use client';

import { useCallback, useRef } from 'react';

interface Props {
  // Called continuously during drag with the horizontal delta (px).
  onResize: (deltaX: number) => void;
}

export function ResizeDivider({ onResize }: Props) {
  const dragging = useRef(false);
  const lastX = useRef(0);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    lastX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const delta = e.clientX - lastX.current;
    lastX.current = e.clientX;
    onResize(delta);
  }, [onResize]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    dragging.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className="group relative w-1.5 flex-shrink-0 cursor-col-resize flex items-center justify-center select-none touch-none"
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize panel"
    >
      {/* Wider invisible hit area */}
      <div className="absolute inset-y-0 -left-1 -right-1" />
      {/* Visible divider line */}
      <div className="w-px h-full bg-white/10 group-hover:bg-[#579DFF] group-active:bg-[#579DFF] transition-colors" />
      {/* Drag-handle dots */}
      <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-0.5 pointer-events-none">
        <span className="w-0.5 h-0.5 rounded-full bg-white/60" />
        <span className="w-0.5 h-0.5 rounded-full bg-white/60" />
        <span className="w-0.5 h-0.5 rounded-full bg-white/60" />
      </div>
    </div>
  );
}
