"use client";

import { useTransition } from "react";
import { Loader2, Zap, Building2, CheckCircle2 } from "lucide-react";
import { createCheckoutSession, createBillingPortalSession } from "@/features/billing/actions";
import { PLANS } from "@/lib/plans";
import type { Plan } from "@prisma/client";

interface Props {
  plan: Plan;
  status: string;
  periodEnd: Date | null;
  canceledAt: Date | null;
  hasSubscription: boolean;
  usage: { boards: number; members: number };
}

export function BillingTab({ plan, status, periodEnd, canceledAt, usage }: Props) {
  const [isPending, startTransition] = useTransition();
  const planDef = PLANS[plan];
  const boardLimit = planDef.boards;
  const memberLimit = planDef.members;
  const boardPct = boardLimit === -1 ? 0 : Math.min(100, (usage.boards / boardLimit) * 100);
  const memberPct = memberLimit === -1 ? 0 : Math.min(100, (usage.members / memberLimit) * 100);
  const isPastDue = status === "past_due";

  function handleUpgrade(target: "PRO" | "BUSINESS") {
    startTransition(async () => { await createCheckoutSession(target); });
  }
  function handleManage() {
    startTransition(async () => { await createBillingPortalSession(); });
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-foreground">{planDef.name}</span>
              <PlanBadge plan={plan} />
              {isPastDue && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">Payment failed</span>}
            </div>
            {periodEnd && status !== "canceled" && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Renews {periodEnd.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            )}
            {canceledAt && (
              <p className="text-xs text-amber-400 mt-0.5">
                Cancels {canceledAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            )}
          </div>
          <span className="text-2xl font-bold text-foreground">{planDef.price === 0 ? "Free" : `$${planDef.price}/mo`}</span>
        </div>
        <div className="space-y-3">
          <UsageMeter label="Boards" used={usage.boards} limit={boardLimit} pct={boardPct} />
          <UsageMeter label="Members" used={usage.members} limit={memberLimit} pct={memberPct} />
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-3 text-foreground">Included in {planDef.name}</h3>
        <ul className="space-y-1.5">
          {planDef.features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 size={13} className="text-green-500 flex-shrink-0" /> {f}
            </li>
          ))}
        </ul>
      </div>

      {plan === "FREE" ? (
        <div className="space-y-3">
          <button onClick={() => handleUpgrade("PRO")} disabled={isPending}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground text-sm font-medium px-4 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50">
            {isPending ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />} Upgrade to Pro — $9/month
          </button>
          <button onClick={() => handleUpgrade("BUSINESS")} disabled={isPending}
            className="w-full flex items-center justify-center gap-2 border border-border text-foreground text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-accent disabled:opacity-50">
            {isPending ? <Loader2 size={15} className="animate-spin" /> : <Building2 size={15} />} Upgrade to Business — $19/month
          </button>
        </div>
      ) : (
        <button onClick={handleManage} disabled={isPending}
          className={`w-full flex items-center justify-center gap-2 text-sm font-medium px-4 py-2.5 rounded-lg disabled:opacity-50 ${isPastDue ? "bg-red-500 text-white hover:bg-red-600" : "bg-muted hover:bg-accent text-foreground"}`}>
          {isPending ? <Loader2 size={15} className="animate-spin" /> : null}
          {isPastDue ? "Update payment method" : "Manage subscription"}
        </button>
      )}
    </div>
  );
}

function PlanBadge({ plan }: { plan: Plan }) {
  const styles: Record<Plan, string> = {
    FREE: "bg-muted text-muted-foreground",
    PRO: "bg-blue-500/20 text-blue-400",
    BUSINESS: "bg-purple-500/20 text-purple-400",
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[plan]}`}>{plan}</span>;
}

function UsageMeter({ label, used, limit, pct }: { label: string; used: number; limit: number; pct: number }) {
  const isUnlimited = limit === -1;
  const isNearLimit = pct >= 80 && !isUnlimited;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className={isNearLimit ? "text-amber-400" : "text-muted-foreground"}>{used} / {isUnlimited ? "∞" : limit}</span>
      </div>
      {!isUnlimited && (
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
      )}
    </div>
  );
}
