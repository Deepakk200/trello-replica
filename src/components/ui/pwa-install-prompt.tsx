"use client";

import { useEffect, useState } from "react";
import { X, Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Don't show if already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    // Don't show if user dismissed within the last 7 days
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed && Date.now() - Number(dismissed) < 7 * 24 * 60 * 60 * 1000) return;

    function handler(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show banner 5 seconds after the install prompt is available
      setTimeout(() => setVisible(true), 5000);
    }

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setVisible(false);
  }

  function handleDismiss() {
    localStorage.setItem("pwa-install-dismissed", String(Date.now()));
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80
                 bg-card border border-border rounded-xl shadow-2xl p-4 z-50
                 flex items-start gap-3 animate-in slide-in-from-bottom-4 duration-300"
      role="dialog"
      aria-label="Install app"
    >
      <div className="w-10 h-10 rounded-lg bg-[#0052CC] flex items-center
                      justify-center flex-shrink-0">
        <Download size={18} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">Install Trello Clone</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Add to your home screen for quick access
        </p>
        <div className="flex gap-2 mt-2">
          <button
            onClick={handleInstall}
            className="text-xs bg-primary text-primary-foreground
                       px-3 py-1.5 rounded-md font-medium hover:opacity-90"
          >
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="text-xs text-muted-foreground hover:text-foreground px-2"
          >
            Not now
          </button>
        </div>
      </div>
      <button
        onClick={handleDismiss}
        className="text-muted-foreground hover:text-foreground flex-shrink-0"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
