'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal,
         Calendar, Link, Lock } from 'lucide-react';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function formatHour(h: number): string {
  if (h === 0) return ''; // midnight — no label
  if (h < 12) return `${h} am`;
  if (h === 12) return '12 pm';
  return `${h - 12} pm`;
}

function getWeekday(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

export function PlannerView() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthYear = currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const weekday = getWeekday(currentDate);
  const dayNum = currentDate.getDate();

  function prevDay() {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  }
  function nextDay() {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  }
  function goToday() { setCurrentDate(new Date()); }

  const isToday = currentDate.toDateString() === new Date().toDateString();

  return (
    <div
      className="relative flex flex-col h-full"
      style={{ background: '#1C2B41', width: 360, flexShrink: 0 }}
    >
      {/* Calendar nav header */}
      <div className="flex items-center gap-1 h-11 px-3 border-b border-white/10 flex-shrink-0">
        <button className="flex items-center gap-1 text-sm text-white font-medium hover:bg-white/10 px-2 py-1 rounded">
          <Calendar size={14} className="text-white/60" />
          {monthYear}
          <ChevronRight size={12} className="text-white/60" />
        </button>

        <div className="flex items-center gap-0.5 ml-1">
          <button onClick={prevDay} className="p-1 rounded hover:bg-white/10 text-white/60 hover:text-white" aria-label="Previous day">
            <ChevronLeft size={14} />
          </button>
          <button onClick={goToday} className="px-2 py-0.5 text-sm text-white hover:bg-white/10 rounded">
            Today
          </button>
          <button onClick={nextDay} className="p-1 rounded hover:bg-white/10 text-white/60 hover:text-white" aria-label="Next day">
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="flex-1" />

        <button className="p-1 rounded hover:bg-white/10 text-white/50" aria-label="Planner options">
          <MoreHorizontal size={14} />
        </button>
      </div>

      {/* Day header row */}
      <div className="flex items-baseline gap-3 px-12 py-2 border-b border-white/10 flex-shrink-0">
        <span className="text-2xl font-light text-white">{weekday}</span>
        <span
          className={`text-2xl font-semibold ${
            isToday
              ? 'bg-[#0052CC] text-white w-9 h-9 rounded-full flex items-center justify-center'
              : 'text-white/80'
          }`}
        >
          {dayNum}
        </span>
      </div>

      {/* Time grid with scroll */}
      <div className="flex-1 overflow-y-auto relative">
        <div className="sticky top-0 left-0 z-10 text-xs text-white/30 px-3 py-1" style={{ background: '#1C2B41' }}>
          GMT+5:30
        </div>

        {HOURS.map((hour) => (
          <div key={hour} className="flex items-start border-b border-white/5 min-h-[52px]">
            <div className="w-12 flex-shrink-0 text-right pr-3 pt-0.5">
              <span className="text-xs text-white/30">{formatHour(hour)}</span>
            </div>
            <div className="flex-1 border-l border-white/10 hover:bg-white/[0.03] cursor-pointer transition-colors" />
          </div>
        ))}
      </div>

      {/* Empty state overlay — shown when no calendar connected */}
      <div
        className="absolute inset-x-0 flex flex-col items-center justify-center gap-6 px-8 pointer-events-none"
        style={{ top: '100px', bottom: '60px' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#0078D4] flex items-center justify-center text-white text-lg font-bold shadow-lg">O</div>
          <div className="flex flex-col gap-1">
            <div className="w-6 h-0.5 bg-white/30 rounded" />
            <div className="w-6 h-0.5 bg-white/30 rounded self-end" />
          </div>
          <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-lg">
            <svg width="24" height="24" viewBox="0 0 24 24">
              <rect width="24" height="24" rx="4" fill="white" />
              <rect x="3" y="3" width="18" height="18" rx="2" fill="#4285F4" fillOpacity="0.1" stroke="#4285F4" strokeWidth="1" />
              <text x="12" y="16" textAnchor="middle" fill="#EA4335" fontSize="10" fontWeight="bold">12</text>
            </svg>
          </div>
          <div className="flex flex-col gap-1">
            <div className="w-6 h-0.5 bg-white/30 rounded" />
            <div className="w-6 h-0.5 bg-white/30 rounded self-end" />
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#0052CC] flex items-center justify-center shadow-lg">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect x="3" y="3" width="8" height="17" rx="1.5" fill="white" />
              <rect x="13" y="3" width="8" height="11" rx="1.5" fill="white" />
            </svg>
          </div>
        </div>

        <div className="text-center pointer-events-auto">
          <h3 className="text-base font-semibold text-white mb-2">Connect your calendar account</h3>
          <p className="text-sm text-white/60 leading-relaxed mb-6 max-w-[280px]">
            See all of your events. Drag, drop, get it done. Schedule your to-dos on your calendar and make time for what truly matters.
          </p>
          <button className="flex items-center gap-2 mx-auto border border-white/30 text-white text-sm px-5 py-2 rounded-full hover:bg-white/10 transition-colors">
            <Link size={14} />
            Connect an account
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-white/10 flex-shrink-0">
        <Lock size={12} className="text-white/40 flex-shrink-0" />
        <span className="text-xs text-white/40">Only you can see your Planner.</span>
      </div>
    </div>
  );
}
