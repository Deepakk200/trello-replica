import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getStripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { sendEmail } from "@/lib/email";
import { PaymentReceiptEmail } from "@/../emails/payment-receipt";
import type Stripe from "stripe";

export async function POST(req: NextRequest) {
  // 1. Raw body (NEVER req.json() — JSON parsing breaks signature verification).
  const body = await req.text();

  // 2. Signature (headers() is async in Next 16).
  const hdrs = await headers();
  const signature = hdrs.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "No signature" }, { status: 400 });

  const webhookSecret =
    process.env.NODE_ENV === "development" && process.env.STRIPE_WEBHOOK_SECRET_LOCAL
      ? process.env.STRIPE_WEBHOOK_SECRET_LOCAL
      : process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });

  // 3. Verify.
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    logger.error("Stripe webhook signature verification failed", { error: (err as Error).message });
    return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 });
  }

  // 4. Process — always return 200 after verification (Stripe retries on non-2xx).
  try {
    await handleStripeEvent(event);
  } catch (err) {
    logger.error("Stripe webhook processing error", { eventType: event.type, eventId: event.id, error: (err as Error).message });
  }
  return NextResponse.json({ received: true });
}

async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== "subscription") break;
      const workspaceId = session.metadata?.workspaceId;
      const planName = session.metadata?.planName as "PRO" | "BUSINESS" | undefined;
      if (!workspaceId || !planName) {
        logger.warn("checkout.session.completed: missing metadata", { sessionId: session.id });
        break;
      }
      const subscription = await getStripe().subscriptions.retrieve(session.subscription as string);
      await db.workspace.update({
        where: { id: workspaceId },
        data: {
          planName,
          planStatus: subscription.status,
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: session.customer as string,
          planCurrentPeriodEnd: new Date((subscription as unknown as { current_period_end: number }).current_period_end * 1000),
          planCanceledAt: null,
        },
      });
      logger.info("Workspace upgraded", { workspaceId, planName });
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const workspaceId = subscription.metadata?.workspaceId;
      if (workspaceId) {
        await updateWorkspaceSubscription(workspaceId, subscription);
      } else {
        const ws = await db.workspace.findFirst({ where: { stripeSubscriptionId: subscription.id }, select: { id: true } });
        if (ws) await updateWorkspaceSubscription(ws.id, subscription);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const ws = await db.workspace.findFirst({ where: { stripeSubscriptionId: subscription.id }, select: { id: true } });
      if (!ws) break;
      await db.workspace.update({
        where: { id: ws.id },
        data: { planName: "FREE", planStatus: "canceled", stripeSubscriptionId: null, planCurrentPeriodEnd: null, planCanceledAt: new Date() },
      });
      logger.info("Workspace downgraded to FREE", { workspaceId: ws.id });
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      const subId = (invoice as unknown as { subscription?: string }).subscription;
      if (!subId) break;
      const subscription = await getStripe().subscriptions.retrieve(subId);
      const ws = await db.workspace.findFirst({ where: { stripeSubscriptionId: subId }, select: { id: true, planName: true } });
      if (ws) {
        await db.workspace.update({
          where: { id: ws.id },
          data: { planStatus: "active", planCurrentPeriodEnd: new Date((subscription as unknown as { current_period_end: number }).current_period_end * 1000) },
        });

        // Email the workspace owner a payment receipt (best-effort).
        const owner = await db.workspaceMember.findFirst({
          where: { workspaceId: ws.id, role: "OWNER" },
          include: { user: { select: { email: true, name: true } } },
        });
        if (owner?.user.email) {
          const baseUrl = process.env.NEXTAUTH_URL ?? "https://trello-replica-one.vercel.app";
          await sendEmail({
            to: owner.user.email,
            subject: "Payment confirmed — Trello Clone",
            react: PaymentReceiptEmail({
              userName: owner.user.name ?? "there",
              planName: ws.planName,
              amount: `$${ws.planName === "PRO" ? "9.00" : "19.00"}`,
              periodEnd: new Date(
                (subscription as unknown as { current_period_end: number }).current_period_end * 1000
              ).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
              invoiceUrl: invoice.hosted_invoice_url ?? baseUrl,
              portalUrl: `${baseUrl}/settings?tab=billing`,
            }),
          });
        }
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subId = (invoice as unknown as { subscription?: string }).subscription ?? "";
      const ws = await db.workspace.findFirst({ where: { stripeSubscriptionId: subId }, select: { id: true } });
      if (ws) {
        await db.workspace.update({ where: { id: ws.id }, data: { planStatus: "past_due" } });
        logger.warn("Invoice payment failed — workspace past_due", { workspaceId: ws.id });
      }
      break;
    }

    default:
      break;
  }
}

async function updateWorkspaceSubscription(workspaceId: string, subscription: Stripe.Subscription): Promise<void> {
  const priceId = subscription.items.data[0]?.price.id;
  let planName: "PRO" | "BUSINESS" | "FREE" = "FREE";
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) planName = "PRO";
  if (priceId === process.env.STRIPE_BUSINESS_PRICE_ID) planName = "BUSINESS";

  await db.workspace.update({
    where: { id: workspaceId },
    data: {
      planName,
      planStatus: subscription.status,
      planCurrentPeriodEnd: new Date((subscription as unknown as { current_period_end: number }).current_period_end * 1000),
      planCanceledAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null,
    },
  });
}
