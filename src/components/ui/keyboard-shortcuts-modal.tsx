"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Keyboard } from "lucide-react";

const SHORTCUTS = [
  {
    category: "Navigation",
    items: [
      { keys: ["Cmd", "K"], label: "Open search" },
      { keys: ["?"], label: "Show this help" },
      { keys: ["Esc"], label: "Close modal / cancel" },
    ],
  },
  {
    category: "Board",
    items: [
      { keys: ["N"], label: "Add a new card (focus on list first)" },
      { keys: ["B"], label: "Open board switcher" },
      { keys: ["F"], label: "Filter cards" },
      { keys: ["W"], label: "Toggle board menu" },
    ],
  },
  {
    category: "Card (when focused)",
    items: [
      { keys: ["↵ Enter"], label: "Open card detail" },
      { keys: ["Space"], label: "Toggle complete" },
      { keys: ["E"], label: "Quick edit" },
      { keys: ["L"], label: "Labels (quick edit)" },
      { keys: ["D"], label: "Open card details" },
      { keys: ["C"], label: "Archive card" },
      { keys: ["Shift", "↵"], label: "Select card" },
    ],
  },
  {
    category: "Global",
    items: [
      { keys: ["Cmd", "/"], label: "Toggle dark / light mode" },
      { keys: ["Cmd", "Z"], label: "Undo last action" },
    ],
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ open, onClose }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center
                 bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <div className="bg-card border border-border rounded-xl shadow-2xl
                      w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Keyboard size={16} />
            Keyboard Shortcuts
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Shortcuts list */}
        <div className="overflow-y-auto p-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {SHORTCUTS.map((section) => (
            <div key={section.category}>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase
                             tracking-wide mb-3">
                {section.category}
              </h3>
              <div className="space-y-2">
                {section.items.map((shortcut) => (
                  <div
                    key={shortcut.label}
                    className="flex items-center justify-between gap-4"
                  >
                    <span className="text-sm text-muted-foreground">
                      {shortcut.label}
                    </span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key) => (
                        <kbd
                          key={key}
                          className="text-xs bg-muted border border-border rounded
                                     px-1.5 py-0.5 font-mono"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            Press <kbd className="font-mono">?</kbd> anywhere to toggle this panel
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
