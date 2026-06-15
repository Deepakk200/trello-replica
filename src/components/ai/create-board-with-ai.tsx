"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, Check, X } from "lucide-react";
import { aiGenerateBoard, type GeneratedBoard } from "@/features/ai/assist";
import { createBoardFromGalleryTemplate } from "@/features/templates/clone";
import type { GalleryTemplate } from "@/data/templates";

const BG = "linear-gradient(135deg,#403294,#6554c0)";

// B2: generate a board structure from a prompt (server-side, zod-validated), let
// the user review, then build it via the real clone path.
export function CreateBoardWithAI() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<GeneratedBoard | null>(null);

  async function generate() {
    if (!prompt.trim()) return;
    setLoading(true); setError(""); setPreview(null);
    try {
      const r = await aiGenerateBoard({ prompt: prompt.trim() });
      if (r.ok) setPreview(r.board);
      else setError(r.error);
    } catch {
      setError("AI request failed");
    } finally {
      setLoading(false);
    }
  }

  function accept() {
    if (!preview) return;
    const tpl: GalleryTemplate = {
      id: "ai", slug: "ai", title: preview.title, category: "Personal",
      description: "", previewColor: BG, author: "AI", viewCount: 0,
      lists: preview.lists.map((l) => ({
        title: l.title,
        cards: l.cards.map((c) => ({ title: c.title, description: c.description })),
      })),
    };
    createBoardFromGalleryTemplate(tpl, { name: preview.title, background: BG });
    router.push("/b");
  }

  function reset() { setOpen(false); setPrompt(""); setPreview(null); setError(""); }

  return (
    <>
      <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 btn-primary text-sm px-3 py-2">
        <Sparkles size={15} /> Create with AI
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] bg-black/60 flex items-start justify-center py-16 px-4" onClick={reset}>
          <div className="w-full max-w-md bg-trello-surfaceRaised border border-trello-border rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-trello-border">
              <h2 className="text-base font-semibold text-trello-text flex items-center gap-2"><Sparkles size={16} className="text-trello-accent" /> Create board with AI</h2>
              <button onClick={reset} aria-label="Close" className="p-1 rounded hover:bg-trello-cardHover text-trello-textSubtle hover:text-trello-text"><X size={18} /></button>
            </div>

            <div className="p-4 flex flex-col gap-3">
              <textarea
                rows={2} value={prompt} onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the board, e.g. “Plan a product launch”"
                className="w-full bg-trello-cardBg border border-trello-borderSubtle focus:border-trello-accent rounded px-3 py-2 text-sm text-trello-text outline-none resize-none"
              />
              <button onClick={generate} disabled={loading || !prompt.trim()} className="btn-soft text-sm px-3 py-1.5 self-start flex items-center gap-1.5 disabled:opacity-50">
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Generate
              </button>
              {error && <p className="text-xs text-trello-danger">{error}</p>}

              {preview && (
                <div className="border border-trello-borderSubtle rounded-lg p-3 max-h-72 overflow-y-auto">
                  <p className="text-sm font-semibold text-trello-text mb-2">{preview.title}</p>
                  <div className="flex flex-col gap-2">
                    {preview.lists.map((l, i) => (
                      <div key={i}>
                        <p className="text-xs font-semibold text-trello-textSecondary">{l.title}</p>
                        <ul className="list-disc pl-5 text-xs text-trello-textSubtle">
                          {l.cards.map((c, j) => <li key={j}>{c.title}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {preview && (
                <button onClick={accept} className="btn-primary text-sm px-3 py-2 flex items-center justify-center gap-1.5">
                  <Check size={15} /> Create this board
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
