// Plan definitions — single source of truth for limits and features.
// Stripe owns BILLING STATE; this file owns FEATURE LIMITS.

export const PLANS = {
  FREE: {
    name: "Free", price: 0, priceId: null,
    boards: 3, members: 5, aiCalls: 10, attachmentMB: 10,
    features: ["3 boards", "5 members", "Basic templates", "10 AI calls/month", "10MB attachments"],
  },
  PRO: {
    name: "Pro", price: 9, priceId: process.env.STRIPE_PRO_PRICE_ID ?? "",
    boards: 20, members: 25, aiCalls: 200, attachmentMB: 500,
    features: ["20 boards", "25 members", "All templates", "200 AI calls/month", "500MB attachments", "Webhooks", "API keys", "Audit log", "Priority support"],
  },
  BUSINESS: {
    name: "Business", price: 19, priceId: process.env.STRIPE_BUSINESS_PRICE_ID ?? "",
    boards: -1, members: -1, aiCalls: 1000, attachmentMB: 5000,
    features: ["Unlimited boards", "Unlimited members", "All templates", "1,000 AI calls/month", "5GB attachments", "Webhooks + API keys", "Audit log", "Advanced permissions", "Priority support", "SLA guarantee"],
  },
} as const;

export type PlanName = keyof typeof PLANS;

export function getPlanLimit(plan: PlanName, resource: "boards" | "members" | "aiCalls" | "attachmentMB"): number {
  return PLANS[plan][resource] as number;
}

export function isAtLimit(plan: PlanName, resource: "boards" | "members", currentCount: number): boolean {
  const limit = getPlanLimit(plan, resource);
  if (limit === -1) return false;
  return currentCount >= limit;
}
