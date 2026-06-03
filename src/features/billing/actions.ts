"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { PLANS } from "@/lib/plans";
import { redirect } from "next/navigation";

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (!session.user.workspaceId) throw new Error("No workspace");
  return session.user;
}

async function getOrCreateStripeCustomer(workspaceId: string, userEmail: string, workspaceName: string): Promise<string> {
  const ws = await db.workspace.findUnique({ where: { id: workspaceId }, select: { stripeCustomerId: true } });
  if (ws?.stripeCustomerId) return ws.stripeCustomerId;

  const customer = await getStripe().customers.create({ email: userEmail, name: workspaceName, metadata: { workspaceId } });
  await db.workspace.update({ where: { id: workspaceId }, data: { stripeCustomerId: customer.id } });
  return customer.id;
}

export async function createCheckoutSession(planName: "PRO" | "BUSINESS") {
  const user = await requireAuth();
  const workspace = await db.workspace.findUnique({
    where: { id: user.workspaceId! },
    select: { id: true, name: true, stripeCustomerId: true, stripeSubscriptionId: true },
  });
  if (!workspace) throw new Error("Workspace not found");

  if (workspace.stripeSubscriptionId) {
    // Already subscribed — send to the portal to manage instead.
    return createBillingPortalSession();
  }

  const priceId = PLANS[planName].priceId;
  if (!priceId) throw new Error(`No price ID configured for ${planName}`);

  const customerId = await getOrCreateStripeCustomer(workspace.id, user.email ?? "", workspace.name);
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/settings?tab=billing&upgraded=true`,
    cancel_url: `${baseUrl}/settings?tab=billing&canceled=true`,
    metadata: { workspaceId: workspace.id, planName },
    subscription_data: { metadata: { workspaceId: workspace.id, planName } },
    allow_promotion_codes: true,
  });

  if (!session.url) throw new Error("No checkout URL returned from Stripe");
  redirect(session.url);
}

export async function createBillingPortalSession() {
  const user = await requireAuth();
  const workspace = await db.workspace.findUnique({ where: { id: user.workspaceId! }, select: { stripeCustomerId: true } });
  if (!workspace?.stripeCustomerId) throw new Error("No Stripe customer found. Please subscribe first.");

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const session = await getStripe().billingPortal.sessions.create({
    customer: workspace.stripeCustomerId,
    return_url: `${baseUrl}/settings?tab=billing`,
  });
  redirect(session.url);
}

export async function getBillingInfo() {
  const user = await requireAuth();
  const workspace = await db.workspace.findUnique({
    where: { id: user.workspaceId! },
    select: {
      id: true, planName: true, planStatus: true, planCurrentPeriodEnd: true,
      planCanceledAt: true, stripeSubscriptionId: true,
    },
  });
  if (!workspace) throw new Error("Workspace not found");

  const [boards, members] = await Promise.all([
    db.board.count({ where: { workspaceId: workspace.id, deletedAt: null, closed: false } }),
    db.workspaceMember.count({ where: { workspaceId: workspace.id } }),
  ]);

  return {
    plan: workspace.planName,
    status: workspace.planStatus,
    periodEnd: workspace.planCurrentPeriodEnd,
    canceledAt: workspace.planCanceledAt,
    hasSubscription: !!workspace.stripeSubscriptionId,
    usage: { boards, members },
  };
}
