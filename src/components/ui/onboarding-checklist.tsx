"use client";

import { useState } from "react";
import { CheckCircle2, Circle, ChevronRight, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  action?: () => void;
  cta?: string;
}

interface Props {
  // These booleans come from the server (board count, has team member, etc.)
  hasCreatedBoard: boolean;
  hasCreatedCard: boolean;
  hasInvitedMember: boolean;
  hasUploadedFile: boolean;
}

export function OnboardingChecklist({
  hasCreatedBoard,
  hasCreatedCard,
  hasInvitedMember,
  hasUploadedFile,
}: Props) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const allDone =
    hasCreatedBoard && hasCreatedCard && hasInvitedMember && hasUploadedFile;

  if (allDone) return null;

  const items: ChecklistItem[] = [
    {
      id: "board",
      label: "Create your first board",
      done: hasCreatedBoard,
      cta: "Create board",
      action: () => {
        document.querySelector<HTMLButtonElement>("[data-create-board]")?.click();
      },
    },
    {
      id: "card",
      label: "Add a card to a list",
      done: hasCreatedCard,
      cta: "Open a board",
      action: () => router.push("/boards"),
    },
    {
      id: "member",
      label: "Invite a team member",
      done: hasInvitedMember,
      cta: "Go to settings",
      action: () => router.push("/settings?tab=members"),
    },
    {
      id: "file",
      label: "Attach a file to a card",
      done: hasUploadedFile,
      cta: "Open a card",
    },
  ];

  const doneCount = items.filter((i) => i.done).length;
  const pct = Math.round((doneCount / items.length) * 100);

  return (
    <div className="bg-card border border-border rounded-xl p-5 mb-6 relative">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
        aria-label="Dismiss checklist"
      >
        <X size={14} />
      </button>

      <div className="mb-4">
        <h2 className="text-sm font-semibold mb-1">
          Get started — {doneCount}/{items.length} complete
        </h2>
        {/* Progress bar */}
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${
              item.done ? "opacity-50" : "hover:bg-muted/40"
            }`}
          >
            {item.done ? (
              <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
            ) : (
              <Circle size={16} className="text-muted-foreground flex-shrink-0" />
            )}
            <span
              className={`text-sm flex-1 ${
                item.done ? "line-through text-muted-foreground" : ""
              }`}
            >
              {item.label}
            </span>
            {!item.done && item.action && (
              <button
                onClick={item.action}
                className="text-xs text-primary hover:underline flex items-center gap-0.5"
              >
                {item.cta} <ChevronRight size={12} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
