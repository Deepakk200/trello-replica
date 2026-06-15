'use client';

// Workspace Billing page (FRONTEND MOCK — real Stripe arrives in the billing
// phase). Static plan data; "Upgrade" is a stub modal. No persisted state.
import { useState } from 'react';
import { Check, Minus, Sparkles, X } from 'lucide-react';

type Plan = {
  name: string;
  price: string;
  per: string;
  highlight?: boolean;
  cta: string;
  features: { label: string; included: boolean }[];
};

const PLANS: Plan[] = [
  {
    name: 'Free', price: '$0', per: 'free for your whole team', cta: 'Current plan',
    features: [
      { label: 'Unlimited cards', included: true },
      { label: 'Up to 10 boards per workspace', included: true },
      { label: 'Unlimited storage (10MB/file)', included: true },
      { label: 'Advanced checklists', included: false },
      { label: 'Custom backgrounds & stickers', included: false },
    ],
  },
  {
    name: 'Premium', price: '$10', per: 'per user/month', highlight: true, cta: 'Upgrade',
    features: [
      { label: 'Everything in Free', included: true },
      { label: 'Unlimited boards', included: true },
      { label: 'Calendar, Timeline, Table, Dashboard views', included: true },
      { label: 'Advanced checklists', included: true },
      { label: 'Admin & security features', included: false },
    ],
  },
  {
    name: 'Enterprise', price: '$17.50', per: 'per user/month', cta: 'Upgrade',
    features: [
      { label: 'Everything in Premium', included: true },
      { label: 'Unlimited workspaces', included: true },
      { label: 'Organization-wide permissions', included: true },
      { label: 'Admin & security features', included: true },
      { label: 'Multi-board guests', included: true },
    ],
  },
];

export function WorkspaceBillingPage() {
  const [upgradePlan, setUpgradePlan] = useState<string | null>(null);

  return (
    <div className="px-6 py-6 md:px-10 max-w-[1000px]">
      <h1 className="text-xl font-bold text-white mb-1">Billing</h1>
      <p className="text-sm text-white/55 mb-6">
        Manage your workspace plan.
        <span className="ml-1 text-white/35">(Mock — real payments arrive with Stripe in the billing phase.)</span>
      </p>

      {/* Current plan */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-wide text-white/40">Current plan</p>
          <p className="text-2xl font-bold text-white mt-0.5">Free</p>
          <p className="text-sm text-white/55 mt-1">$0 — free for your whole team.</p>
        </div>
        <button
          onClick={() => setUpgradePlan('Premium')}
          className="flex items-center gap-1.5 h-9 px-4 rounded text-sm font-medium text-white"
          style={{ background: 'linear-gradient(90deg,#8B5CF6,#0C66E4)' }}
        >
          <Sparkles size={15} /> Upgrade
        </button>
      </div>

      {/* Plan comparison */}
      <h2 className="text-base font-semibold text-white mb-3">Compare plans</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-xl border p-5 flex flex-col ${plan.highlight ? 'border-[#579DFF] bg-[#1C3D5A]/30' : 'border-white/[0.08] bg-white/[0.02]'}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base font-semibold text-white">{plan.name}</h3>
              {plan.highlight && <span className="text-[10px] font-bold uppercase tracking-wide text-[#579DFF] bg-[#579DFF]/15 px-1.5 py-0.5 rounded">Popular</span>}
            </div>
            <p className="text-2xl font-bold text-white">{plan.price}</p>
            <p className="text-xs text-white/50 mb-4">{plan.per}</p>
            <ul className="flex flex-col gap-2 mb-5 flex-1">
              {plan.features.map((f) => (
                <li key={f.label} className="flex items-start gap-2 text-sm">
                  {f.included
                    ? <Check size={15} className="text-[#4BCE97] mt-0.5 flex-shrink-0" />
                    : <Minus size={15} className="text-white/30 mt-0.5 flex-shrink-0" />}
                  <span className={f.included ? 'text-white/85' : 'text-white/40'}>{f.label}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => plan.name !== 'Free' && setUpgradePlan(plan.name)}
              disabled={plan.name === 'Free'}
              className={`h-9 rounded text-sm font-medium transition-colors ${
                plan.name === 'Free'
                  ? 'bg-white/5 text-white/40 cursor-default'
                  : plan.highlight ? 'text-white' : 'bg-white/10 text-white hover:bg-white/15'
              }`}
              style={plan.highlight ? { background: '#0C66E4' } : undefined}
            >
              {plan.cta}
            </button>
          </div>
        ))}
      </div>

      {/* Billing history */}
      <h2 className="text-base font-semibold text-white mb-3">Billing history</h2>
      <div className="rounded-xl border border-dashed border-white/[0.12] px-4 py-10 text-center">
        <p className="text-sm text-white/50">No invoices yet.</p>
        <p className="text-xs text-white/35 mt-0.5">You&apos;re on the Free plan — invoices appear here after you upgrade.</p>
      </div>

      {upgradePlan && (
        <div className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center px-4" onClick={() => setUpgradePlan(null)}>
          <div className="w-full max-w-sm bg-[#282E33] border border-white/10 rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-base font-semibold text-white flex items-center gap-2"><Sparkles size={16} className="text-[#579DFF]" /> Upgrade to {upgradePlan}</h2>
              <button onClick={() => setUpgradePlan(null)} aria-label="Close" className="p-1 rounded hover:bg-white/10 text-white/60"><X size={18} /></button>
            </div>
            <div className="p-4">
              <p className="text-sm text-white/70 mb-4">
                Billing is coming soon. Checkout for the <span className="text-white font-medium">{upgradePlan}</span> plan
                will be wired up with Stripe in the billing phase.
              </p>
              <button
                onClick={() => setUpgradePlan(null)}
                className="w-full py-2 rounded text-sm font-medium text-white"
                style={{ background: '#0C66E4' }}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
