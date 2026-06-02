'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Archive, ArrowRight, Bookmark, Calendar, CheckSquare,
  Copy, CreditCard, Image, Paperclip, Plus, RotateCcw, Tag, Trash2, Users, X,
} from 'lucide-react';
import { useBoardStore } from '@/store/use-board-store';
import { useShallow } from 'zustand/shallow';
import type { ID } from '@/types';
import { LABEL_VAR } from '@/lib/colors';
import { MemberAvatar } from '@/components/ui/member-avatar';
import { DescriptionEditor } from './description-editor';
import { ActivitySection } from './activity-section';
import { LabelPopover } from './label-popover';
import { DatePopover } from './date-popover';
import { CoverPopover } from './cover-popover';
import { ChecklistSection } from './checklist-section';
import { MembersPopover } from './members-popover';
import { AttachmentsSection } from './attachments-section';
import { LinkedCardsSection } from './linked-cards-section';
import { MoveCardPopover } from './move-card-popover';

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso));
}

export function CardModal({ cardId, onClose }: { cardId: ID; onClose: () => void }) {
  const card           = useBoardStore((s) => s.cards[cardId]);
  const list           = useBoardStore((s) => (card ? s.lists[card.listId] : null));
  const labels         = useBoardStore((s) => s.labels);
  const updateCard     = useBoardStore((s) => s.updateCard);
  const archiveCard    = useBoardStore((s) => s.archiveCard);
  const restoreCard    = useBoardStore((s) => s.restoreCard);
  const deleteCard     = useBoardStore((s) => s.deleteCard);
  const createCard     = useBoardStore((s) => s.createCard);
  const createChecklist    = useBoardStore((s) => s.createChecklist);
  const saveCardAsTemplate = useBoardStore((s) => s.saveCardAsTemplate);

  const [titleDraft, setTitleDraft]       = useState(card?.title ?? '');
  const [showLabels, setShowLabels]       = useState(false);
  const [showDates, setShowDates]         = useState(false);
  const [showCover, setShowCover]         = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [showMembers, setShowMembers]     = useState(false);
  const [showMove, setShowMove]           = useState(false);
  const [clTitle, setClTitle]             = useState('Checklist');
  const [mounted, setMounted]             = useState(false);
  const dialogRef     = useRef<HTMLDivElement>(null);
  const titleRef      = useRef<HTMLTextAreaElement>(null);
  const prevFocusRef  = useRef<HTMLElement | null>(null);
  const prevTitleRef  = useRef<string | undefined>(undefined);

  useEffect(() => {
    prevFocusRef.current = document.activeElement as HTMLElement;
    setMounted(true);
    return () => { prevFocusRef.current?.focus(); };
  }, []);

  useEffect(() => {
    if (!mounted) return;
    setTimeout(() => titleRef.current?.focus(), 0);
    const dialog = dialogRef.current; if (!dialog) return;
    function trapTab(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      const focusable = Array.from(dialog!.querySelectorAll<HTMLElement>(
        'button:not([disabled]),input:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
      ));
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    dialog.addEventListener('keydown', trapTab);
    return () => dialog.removeEventListener('keydown', trapTab);
  }, [mounted]);

  const cardTitle = card?.title;
  useEffect(() => {
    if (cardTitle === undefined || cardTitle === prevTitleRef.current) return;
    prevTitleRef.current = cardTitle;
    setTitleDraft(cardTitle);
  }, [cardTitle]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!card || !mounted) return null;

  function closeAll() { setShowLabels(false); setShowDates(false); setShowCover(false); setShowChecklist(false); setShowMembers(false); setShowMove(false); }

  function commitTitle() {
    const t = titleDraft.trim();
    if (!t) { setTitleDraft(card!.title); return; }
    if (t !== card!.title) updateCard(cardId, { title: t });
  }

  function autoResize(el: HTMLTextAreaElement) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }

  const cardLabels   = card.labelIds.map((id) => labels[id]).filter(Boolean);
  const cardMemberIds = card.memberIds ?? [];
  const isOverdue    = card.dueDate && !card.completed && new Date(card.dueDate) < new Date();
  const hasQuickRow  = cardLabels.length > 0 || !!card.dueDate || cardMemberIds.length > 0;

  const modal = (
    <>
      <div className="animate-backdrop-enter fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} aria-hidden="true" />

      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-modal-title"
        className="anim-modal-enter fixed inset-0 overflow-y-auto pb-safe bg-trello-surfaceOverlay shadow-2xl z-50 text-trello-text outline-none md:inset-auto md:pb-0 md:left-1/2 md:top-12 md:-translate-x-1/2 md:w-[700px] md:max-w-[95vw] md:max-h-[85vh] md:rounded-xl lg:w-[768px]"
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded hover:bg-trello-cardHover text-trello-textSubtle hover:text-trello-text transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Cover image */}
        {card.cover.type !== 'none' && (
          <div
            className="relative w-full h-40 rounded-t-xl overflow-hidden shrink-0"
            style={
              card.cover.type === 'color'
                ? { backgroundColor: card.cover.color }
                : { backgroundImage: card.cover.image, backgroundSize: 'cover', backgroundPosition: 'center' }
            }
          >
            <button
              onClick={() => { closeAll(); setShowCover((v) => !v); }}
              className="absolute bottom-2 right-3 flex items-center gap-1.5 bg-black/40 hover:bg-black/60 text-white text-xs font-medium px-3 py-1.5 rounded transition-colors"
            >
              <Image className="w-3 h-3" />Cover
            </button>
          </div>
        )}

        <div className="p-5 md:grid md:grid-cols-[1fr_190px] md:gap-6">
          {/* ── MAIN ─────────────────────────────────────────────── */}
          <div className="flex flex-col gap-5 min-w-0">

            {/* Header: card number + title */}
            <div className="flex gap-3 pr-8">
              <CreditCard className="w-5 h-5 mt-1.5 text-trello-textSubtle shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-xs text-trello-textSubtle font-medium">#{card.number}</span>
                <textarea
                  ref={titleRef}
                  id="card-modal-title"
                  rows={1}
                  className="w-full bg-transparent text-xl font-semibold text-trello-text resize-none outline-none focus:bg-trello-surface rounded px-1 -ml-1 leading-snug transition-colors"
                  value={titleDraft}
                  onChange={(e) => { setTitleDraft(e.target.value); autoResize(e.target); }}
                  onBlur={commitTitle}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); commitTitle(); titleRef.current?.blur(); }
                  }}
                />
                <p className="text-xs text-trello-textSubtle mt-0.5 px-1">
                  in list{' '}
                  <span className="underline cursor-pointer hover:text-trello-text">{list?.title}</span>
                </p>
              </div>
            </div>

            {/* Quick-row: labels + due date + members */}
            {hasQuickRow && (
              <div className="flex flex-wrap gap-4 pl-8">
                {cardLabels.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-trello-textSubtle mb-1">Labels</p>
                    <div className="flex flex-wrap gap-1">
                      {cardLabels.map((label) => (
                        <span
                          key={label.id}
                          className="text-white text-xs font-medium px-2 py-0.5 rounded"
                          style={{ backgroundColor: LABEL_VAR[label.color] }}
                        >
                          {label.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {card.dueDate && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-trello-textSubtle mb-1">Due date</p>
                    <label className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded cursor-pointer select-none ${
                      card.completed ? 'bg-emerald-700/80 text-white' :
                      isOverdue ? 'bg-red-700/80 text-white' :
                      'bg-trello-cardHover text-trello-text'
                    }`}>
                      <input
                        type="checkbox"
                        className="w-3 h-3"
                        checked={card.completed}
                        onChange={(e) => updateCard(cardId, { completed: e.target.checked })}
                      />
                      {fmtDate(card.dueDate)}
                    </label>
                  </div>
                )}

                {cardMemberIds.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-trello-textSubtle mb-1">Members</p>
                    <div className="flex items-center gap-1 flex-wrap">
                      {cardMemberIds.map((id) => <MemberAvatar key={id} memberId={id} size="sm" />)}
                      <button
                        onClick={() => { closeAll(); setShowMembers((v) => !v); }}
                        className="h-7 w-7 rounded-full bg-trello-cardHover hover:brightness-110 flex items-center justify-center text-trello-textSubtle transition"
                        aria-label="Add member"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <DescriptionEditor cardId={cardId} />

            {/* Attachments (before checklists) */}
            {(card.attachments ?? []).length > 0 && (
              <AttachmentsSection cardId={cardId} />
            )}

            <LinkedCardsSection cardId={cardId} />

            {(card.checklists ?? []).map((cl) => (
              <ChecklistSection key={cl.id} cardId={cardId} checklist={cl} />
            ))}
            <ActivitySection cardId={cardId} />
          </div>

          {/* ── SIDEBAR ──────────────────────────────────────────── */}
          <div className="flex flex-col gap-4 mt-6 md:mt-0">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-trello-textSubtle mb-2">Add to card</p>
              <div className="flex flex-col gap-1">
                <div className="relative">
                  <SidebarBtn
                    icon={<Image className="w-4 h-4" />}
                    label="Cover"
                    onClick={() => { closeAll(); setShowCover((v) => !v); }}
                  />
                  {showCover && <CoverPopover cardId={cardId} onClose={() => setShowCover(false)} />}
                </div>

                <div className="relative">
                  <SidebarBtn
                    icon={<Users className="w-4 h-4" />}
                    label="Members"
                    onClick={() => { closeAll(); setShowMembers((v) => !v); }}
                  />
                  {showMembers && <MembersPopover cardId={cardId} onClose={() => setShowMembers(false)} />}
                </div>

                <div className="relative">
                  <SidebarBtn
                    icon={<Tag className="w-4 h-4" />}
                    label="Labels"
                    onClick={() => { closeAll(); setShowLabels((v) => !v); }}
                  />
                  {showLabels && <LabelPopover cardId={cardId} onClose={() => setShowLabels(false)} />}
                </div>

                <div className="relative">
                  <SidebarBtn
                    icon={<Calendar className="w-4 h-4" />}
                    label="Dates"
                    onClick={() => { closeAll(); setShowDates((v) => !v); }}
                  />
                  {showDates && <DatePopover cardId={cardId} onClose={() => setShowDates(false)} />}
                </div>

                <div className="relative">
                  <SidebarBtn
                    icon={<CheckSquare className="w-4 h-4" />}
                    label="Checklist"
                    onClick={() => { closeAll(); setShowChecklist((v) => !v); }}
                  />
                  {showChecklist && (
                    <div className="absolute right-0 top-full mt-1 w-64 bg-trello-surfaceRaised border border-trello-borderSubtle rounded-lg shadow-2xl z-50 p-3 flex flex-col gap-2">
                      <p className="text-xs font-semibold text-trello-textSubtle uppercase tracking-wide text-center">Add checklist</p>
                      <label className="text-xs text-trello-textSubtle">Title</label>
                      <input
                        autoFocus
                        className="bg-trello-cardBg border border-trello-borderSubtle focus:border-trello-accent rounded px-2 py-1.5 text-sm text-trello-text outline-none transition-colors"
                        value={clTitle}
                        onChange={(e) => setClTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { createChecklist(cardId, clTitle || 'Checklist'); setClTitle('Checklist'); setShowChecklist(false); }
                          if (e.key === 'Escape') setShowChecklist(false);
                        }}
                      />
                      <button
                        onClick={() => { createChecklist(cardId, clTitle || 'Checklist'); setClTitle('Checklist'); setShowChecklist(false); }}
                        className="btn-primary text-sm font-medium px-3 py-1.5"
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <SidebarBtn
                    icon={<Paperclip className="w-4 h-4" />}
                    label="Attachment"
                    onClick={() => { closeAll(); }}
                  />
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-trello-textSubtle mb-2">Actions</p>
              <div className="flex flex-col gap-1">
                <div className="relative">
                  <SidebarBtn
                    icon={<ArrowRight className="w-4 h-4" />}
                    label="Move"
                    onClick={() => { closeAll(); setShowMove((v) => !v); }}
                  />
                  {showMove && <MoveCardPopover cardId={cardId} onClose={() => setShowMove(false)} />}
                </div>
                <SidebarBtn
                  icon={<Copy className="w-4 h-4" />}
                  label="Copy"
                  onClick={() => { createCard(card!.listId, `${card!.title} (copy)`); onClose(); }}
                />
                <SidebarBtn
                  icon={<Bookmark className="w-4 h-4" />}
                  label="Save as template"
                  onClick={() => {
                    const name = window.prompt('Template name:');
                    if (name?.trim()) saveCardAsTemplate(cardId, name.trim());
                  }}
                />
                {card.isArchived ? (
                  <>
                    <button
                      onClick={() => { restoreCard(cardId); onClose(); }}
                      className="btn-soft flex items-center gap-2 hover:bg-trello-accent/20 text-trello-accent text-sm h-8 px-3 w-full"
                    >
                      <RotateCcw className="w-4 h-4" />Send to board
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Permanently delete this card? This cannot be undone.')) {
                          deleteCard(cardId); onClose();
                        }
                      }}
                      className="btn-soft flex items-center gap-2 hover:bg-red-500/20 text-trello-danger text-sm h-8 px-3 w-full"
                    >
                      <Trash2 className="w-4 h-4" />Delete card
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => { archiveCard(cardId); onClose(); }}
                    className="btn-soft flex items-center gap-2 hover:bg-red-500/20 text-trello-danger text-sm h-8 px-3 w-full"
                  >
                    <Archive className="w-4 h-4" />Archive
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modal, document.body);
}

function SidebarBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="btn-soft flex items-center gap-2 text-sm h-11 md:h-8 px-3 w-full justify-start"
    >
      {icon}{label}
    </button>
  );
}
