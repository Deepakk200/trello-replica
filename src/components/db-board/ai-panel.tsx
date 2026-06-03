"use client";

import { useState, useTransition } from "react";
import { Sparkles, X, Loader2 } from "lucide-react";
import {
  generateBoardSummary,
  generateTasksFromDescription,
  generateStandupReport,
  askBoardAssistant,
} from "@/features/ai/actions";
import { createCard } from "@/features/cards/actions";
import { useRouter } from "next/navigation";

interface Props {
  boardId: string;
  boardTitle: string;
  firstListId: string | null;
}

type Tab = "summary" | "tasks" | "standup" | "chat";

export function AIPanel({ boardId, boardTitle, firstListId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("summary");
  const [isPending, startTransition] = useTransition();

  const [summary, setSummary] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [generatedTasks, setGeneratedTasks] = useState<Array<{ title: string; description: string }>>([]);
  const [tasksCreating, setTasksCreating] = useState(false);
  const [standupReport, setStandupReport] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [chatInput, setChatInput] = useState("");

  function handleSummary() {
    setSummary("");
    startTransition(async () => {
      const r = await generateBoardSummary(boardId);
      if (r.ok) setSummary(r.summary);
      else setSummary(`⚠ ${r.error}`);
    });
  }

  function handleGenerateTasks() {
    if (!projectDesc.trim()) return;
    setGeneratedTasks([]);
    startTransition(async () => {
      const r = await generateTasksFromDescription({ projectDescription: projectDesc });
      if (r.ok) setGeneratedTasks(r.tasks);
    });
  }

  async function handleCreateAllTasks() {
    if (!firstListId || generatedTasks.length === 0) return;
    setTasksCreating(true);
    for (const task of generatedTasks) {
      await createCard({ listId: firstListId, title: task.title });
    }
    setGeneratedTasks([]);
    setProjectDesc("");
    setTasksCreating(false);
    router.refresh();
  }

  function handleStandup() {
    setStandupReport("");
    startTransition(async () => {
      const r = await generateStandupReport(boardId);
      if (r.ok) setStandupReport(r.report);
      else setStandupReport(`⚠ ${r.error}`);
    });
  }

  function handleChat() {
    if (!chatInput.trim()) return;
    const question = chatInput;
    setChatInput("");
    const history = [...chatHistory, { role: "user" as const, content: question }];
    setChatHistory(history);
    startTransition(async () => {
      const r = await askBoardAssistant({ boardId, question, conversationHistory: chatHistory });
      if (r.ok) setChatHistory([...history, { role: "assistant", content: r.reply }]);
      else setChatHistory([...history, { role: "assistant", content: `⚠ ${r.error}` }]);
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-white/80 hover:text-white hover:bg-white/20 px-2 py-1 rounded text-sm"
        title="AI Assistant"
      >
        <Sparkles size={14} />
        <span className="hidden sm:inline">AI</span>
      </button>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setOpen(false)} />
      <div className="fixed right-0 top-0 h-full w-[360px] z-50 bg-card border-l border-border flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles size={14} className="text-primary" />
            AI — {boardTitle}
          </div>
          <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
            <X size={16} />
          </button>
        </div>

        <div className="flex border-b border-border">
          {(["summary", "tasks", "standup", "chat"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-xs font-medium capitalize transition-colors ${
                tab === t ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {tab === "summary" && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">Natural-language summary of the current board.</p>
              <button onClick={handleSummary} disabled={isPending} className="flex items-center justify-center gap-2 bg-primary text-primary-foreground text-sm px-4 py-2 rounded-lg disabled:opacity-50">
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Generate Summary
              </button>
              {summary && <div className="bg-muted/40 rounded-lg p-3 text-sm text-foreground leading-relaxed whitespace-pre-wrap">{summary}</div>}
            </div>
          )}

          {tab === "tasks" && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">Describe a project and generate cards.</p>
              <textarea
                value={projectDesc} onChange={(e) => setProjectDesc(e.target.value)}
                placeholder="e.g. Build a user authentication system with email/password and Google OAuth…"
                className="w-full h-24 bg-muted/40 text-sm text-foreground rounded-lg p-3 resize-none outline-none border border-border"
              />
              <button onClick={handleGenerateTasks} disabled={isPending || !projectDesc.trim()} className="flex items-center justify-center gap-2 bg-primary text-primary-foreground text-sm px-4 py-2 rounded-lg disabled:opacity-50">
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Generate Tasks
              </button>
              {generatedTasks.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-muted-foreground">{generatedTasks.length} tasks generated:</p>
                  {generatedTasks.map((t, i) => (
                    <div key={i} className="bg-muted/40 rounded-lg p-2.5 text-sm">
                      <p className="font-medium text-foreground">{t.title}</p>
                      {t.description && <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>}
                    </div>
                  ))}
                  <button onClick={handleCreateAllTasks} disabled={tasksCreating || !firstListId} className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50 mt-1">
                    {tasksCreating ? "Creating…" : `Add all ${generatedTasks.length} to board`}
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === "standup" && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">Standup report from your last 7 days of activity.</p>
              <button onClick={handleStandup} disabled={isPending} className="flex items-center justify-center gap-2 bg-primary text-primary-foreground text-sm px-4 py-2 rounded-lg disabled:opacity-50">
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Generate Report
              </button>
              {standupReport && <div className="bg-muted/40 rounded-lg p-3 text-sm text-foreground leading-relaxed whitespace-pre-wrap">{standupReport}</div>}
            </div>
          )}

          {tab === "chat" && (
            <div className="flex flex-col gap-3 h-full">
              <p className="text-sm text-muted-foreground">Ask anything about this board.</p>
              <div className="flex-1 flex flex-col gap-2 min-h-0">
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`text-sm rounded-lg px-3 py-2 max-w-[90%] ${msg.role === "user" ? "bg-primary text-primary-foreground self-end" : "bg-muted/60 text-foreground self-start"}`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                ))}
                {isPending && <div className="bg-muted/60 rounded-lg px-3 py-2 self-start"><Loader2 size={14} className="animate-spin" /></div>}
              </div>
              <div className="flex gap-2 mt-auto">
                <input
                  value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleChat(); } }}
                  placeholder="Ask about this board…"
                  className="flex-1 bg-muted/40 text-sm text-foreground rounded-lg px-3 py-2 outline-none border border-border"
                />
                <button onClick={handleChat} disabled={isPending || !chatInput.trim()} className="bg-primary text-primary-foreground px-3 py-2 rounded-lg disabled:opacity-50">
                  <Sparkles size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
