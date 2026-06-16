"use client";

// Post-signup onboarding wizard (prompt 12). A light, presentational stepper that
// orients new users and hands off to the app. The workspace-name step writes to
// the local UI store (no DB needed); board creation is delegated to /templates
// and /boards so the wizard itself stays verifiable without a backend.
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Columns3, LayoutTemplate, Check, ArrowRight, ArrowLeft } from "lucide-react";
import { useBoardStore } from "@/store/use-board-store";

const STEPS = ["Welcome", "Your workspace", "First board"] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const setWorkspaceName = useBoardStore((s) => s.setWorkspaceName);
  const currentName = useBoardStore((s) => s.workspaceName);

  const [step, setStep] = useState(0);
  const [name, setName] = useState(currentName);

  function next() {
    if (step === 1 && name.trim()) setWorkspaceName(name.trim());
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else finish();
  }
  function finish() {
    router.push("/boards");
  }

  return (
    <main className="min-h-screen bg-trello-bg text-trello-text flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {STEPS.map((s, i) => (
            <span
              key={s}
              className={`h-1.5 rounded-full transition-all ${i === step ? "w-8 bg-trello-accent" : i < step ? "w-4 bg-trello-accent/60" : "w-4 bg-trello-border"}`}
            />
          ))}
        </div>

        <div className="bg-trello-surfaceRaised border border-trello-border rounded-xl p-6 shadow-2xl">
          {step === 0 && (
            <div className="text-center">
              <span className="inline-flex w-12 h-12 rounded-xl bg-trello-primary items-center justify-center text-white mb-3"><Columns3 size={22} /></span>
              <h1 className="text-xl font-bold mb-1">Welcome to TaskFlow</h1>
              <p className="text-sm text-trello-textSubtle">Let&apos;s get you set up in a few quick steps.</p>
            </div>
          )}

          {step === 1 && (
            <div>
              <h1 className="text-xl font-bold mb-1">Name your workspace</h1>
              <p className="text-sm text-trello-textSubtle mb-4">This is where your boards live. You can change it later in Settings.</p>
              <input
                autoFocus value={name} onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") next(); }}
                placeholder="e.g. Acme Team"
                className="w-full bg-trello-cardBg border border-trello-borderSubtle focus:border-trello-accent rounded px-3 py-2 text-sm outline-none"
              />
            </div>
          )}

          {step === 2 && (
            <div>
              <h1 className="text-xl font-bold mb-1">Create your first board</h1>
              <p className="text-sm text-trello-textSubtle mb-4">Start from a template or a blank board — whatever you prefer.</p>
              <div className="flex flex-col gap-2">
                <Link href="/templates" className="flex items-center gap-2 rounded-lg border border-trello-border hover:border-trello-accent px-3 py-2.5 text-sm">
                  <LayoutTemplate size={16} className="text-trello-accent" /> Browse templates
                </Link>
                <Link href="/boards" className="flex items-center gap-2 rounded-lg border border-trello-border hover:border-trello-accent px-3 py-2.5 text-sm">
                  <Columns3 size={16} className="text-trello-accent" /> Start with a blank board
                </Link>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-6">
            <button
              onClick={() => (step > 0 ? setStep((s) => s - 1) : router.push("/boards"))}
              className="flex items-center gap-1 text-sm text-trello-textSubtle hover:text-trello-text px-2 py-1.5"
            >
              {step > 0 ? <><ArrowLeft size={14} /> Back</> : "Skip"}
            </button>
            <button onClick={next} className="btn-primary flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium">
              {step === STEPS.length - 1 ? <><Check size={15} /> Finish</> : <>Next <ArrowRight size={15} /></>}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
