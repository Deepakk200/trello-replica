'use client';

// Trello's board "⋯" menu as a right-docked, full-height, scrollable side panel.
// Presentational: the parent (DbBoardView) passes the wired actions; rows without
// a backing feature degrade gracefully. Custom Fields / Make template are gated.

import { useEffect, useState } from 'react';
import {
  X, UserPlus, Info, Users, Share2, Star, Settings, Folder, Zap, Plug, Tag,
  Sticker, LayoutTemplate, Clock, Archive, Eye, Copy, Mail, Minus, Flag, Briefcase,
} from 'lucide-react';

type Props = {
  onClose: () => void;
  canEdit: boolean;
  starred: boolean;
  visibility: string;
  backgrounds: string[];
  currentBg: string;
  initials: string;
  onToggleStar: () => void;
  onChangeBackground: (sw: string) => void;
  onExport: () => void;
  onSettings: () => void;
  onCloseBoard: () => void;
  onGraceful: (label: string) => void;
};

function Row({
  icon, label, subtitle, onClick, disabled, trailing, muted,
}: {
  icon: React.ReactNode; label: string; subtitle?: string;
  onClick?: () => void; disabled?: boolean; trailing?: React.ReactNode; muted?: boolean;
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded transition-colors ${
        disabled ? 'cursor-default' : 'hover:bg-white/[0.08]'
      }`}
    >
      <span className={`shrink-0 ${muted ? 'text-white/30' : 'text-white/70'}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className={`block text-sm ${muted ? 'text-white/35' : 'text-white/90'} truncate`}>{label}</span>
        {subtitle && <span className="block text-xs text-white/40 truncate">{subtitle}</span>}
      </span>
      {trailing}
    </button>
  );
}

function UpgradePill() {
  return (
    <span className="shrink-0 flex items-center gap-1 rounded-full bg-[#8270DB]/25 text-[#B8ACF6] text-[11px] font-medium px-2 py-0.5">
      <Briefcase size={11} /> Upgrade
    </span>
  );
}

const Divider = () => <div className="my-1 border-t border-white/[0.08]" />;

export function BoardMenuPanel(props: Props) {
  const {
    onClose, canEdit, starred, visibility, backgrounds, currentBg, initials,
    onToggleStar, onChangeBackground, onExport, onSettings, onCloseBoard, onGraceful,
  } = props;
  const [bgOpen, setBgOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const vis = visibility ? visibility[0].toUpperCase() + visibility.slice(1) : 'Workspace';

  return (
    <>
      {/* Outside-click catcher (board stays visible underneath) */}
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />
      <aside
        role="dialog"
        aria-label="Board menu"
        className="fixed right-0 top-0 z-50 h-screen w-[360px] max-w-[88vw] flex flex-col border-l border-white/10 shadow-2xl anim-panel-enter-left"
        style={{ background: '#282E33' }}
      >
        {/* Header */}
        <div className="relative flex items-center justify-center h-12 shrink-0 border-b border-white/10">
          <span className="text-sm font-semibold text-white/90">Menu</span>
          <button onClick={onClose} aria-label="Close menu" className="absolute right-2 top-2 p-1.5 rounded text-white/60 hover:text-white hover:bg-white/10">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {/* Share + avatar */}
          <Row
            icon={<UserPlus size={17} />}
            label="Share"
            onClick={() => onGraceful('Share')}
            trailing={
              <span className="shrink-0 w-7 h-7 rounded-full bg-[#00B8D9] text-white text-[11px] font-bold flex items-center justify-center ring-2 ring-[#282E33] relative">
                {initials}
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#22272B] flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#579DFF]" />
                </span>
              </span>
            }
          />

          <Divider />

          <Row icon={<Info size={17} />} label="About this board" subtitle="Add a description to your board" onClick={() => onGraceful('About this board')} />
          <Row icon={<Users size={17} />} label={`Visibility: ${vis}`} onClick={() => onGraceful('Visibility')} />
          <Row icon={<Share2 size={17} />} label="Print, export, and share" onClick={onExport} />
          <Row
            icon={<Star size={17} className={starred ? 'fill-yellow-400 text-yellow-400' : ''} />}
            label="Star"
            onClick={onToggleStar}
          />

          <Divider />

          <Row icon={<Settings size={17} />} label="Settings" onClick={onSettings} />
          <Row
            icon={<span className="block w-[17px] h-[17px] rounded" style={{ background: 'linear-gradient(135deg,#8b3dd6,#e85a9c)' }} />}
            label="Change background"
            onClick={canEdit ? () => setBgOpen((v) => !v) : () => onGraceful('Change background')}
          />
          {bgOpen && canEdit && (
            <div className="grid grid-cols-4 gap-1.5 px-3 pb-2" role="radiogroup" aria-label="Board background">
              {backgrounds.map((sw) => (
                <button
                  key={sw}
                  type="button"
                  role="radio"
                  aria-checked={currentBg === sw}
                  aria-label={`Background ${sw}`}
                  onClick={() => { setBgOpen(false); onChangeBackground(sw); }}
                  className={`h-9 rounded transition-transform focus-visible:outline-2 focus-visible:outline-[#579DFF] ${currentBg === sw ? 'ring-2 ring-white' : 'hover:scale-105'}`}
                  style={{ background: sw }}
                />
              ))}
            </div>
          )}
          <Row icon={<Folder size={17} />} label="Custom Fields" muted disabled trailing={<UpgradePill />} />
          {/* Inline upsell card */}
          <div className="relative mx-3 mb-1 mt-0.5 rounded-lg bg-white/[0.04] border border-white/10 p-3 overflow-hidden">
            <p className="text-sm font-semibold text-white/90 mb-1">Upgrade to add Custom Fields</p>
            <p className="text-xs text-white/55 leading-relaxed mb-1.5 pr-8">Add dropdowns, text fields, dates, and more to your cards.</p>
            <button onClick={() => onGraceful('Upgrade')} className="text-xs font-medium text-[#B8ACF6] underline hover:no-underline">Upgrade</button>
            <Briefcase size={26} className="absolute bottom-2 right-2 text-[#8270DB]/60" />
          </div>

          <Divider />

          <Row icon={<Zap size={17} />} label="Automation" onClick={() => onGraceful('Automation')} />
          <Row icon={<Plug size={17} />} label="Power-Ups" onClick={() => onGraceful('Power-Ups')} />
          <Row icon={<Tag size={17} />} label="Labels" onClick={() => onGraceful('Labels')} />
          <Row icon={<Sticker size={17} />} label="Stickers" onClick={() => onGraceful('Stickers')} />
          <Row icon={<LayoutTemplate size={17} />} label="Make template" muted disabled trailing={<UpgradePill />} />
          <Row icon={<Clock size={17} />} label="Activity" onClick={() => onGraceful('Activity')} />
          <Row icon={<Archive size={17} />} label="Archived items" onClick={() => onGraceful('Archived items')} />

          <Divider />

          <Row icon={<Eye size={17} />} label="Watch" onClick={() => onGraceful('Watch')} />
          <Row icon={<Copy size={17} />} label="Copy board" onClick={() => onGraceful('Copy board')} />
          <Row icon={<Mail size={17} />} label="Email-to-board" onClick={() => onGraceful('Email-to-board')} />
          <Row icon={<Minus size={17} />} label="Close board" onClick={onCloseBoard} />

          <Divider />

          <Row icon={<Flag size={17} />} label="Report abuse" onClick={() => onGraceful('Report abuse')} />
        </div>
      </aside>
    </>
  );
}
