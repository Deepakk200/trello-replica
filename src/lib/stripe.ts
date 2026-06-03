import Stripe from "stripe";

// Lazy/guarded — constructing Stripe without a key throws, which would break the
// build/import. getStripe() only constructs at request time when the key is set.
const globalForStripe = globalThis as unknown as { stripe: Stripe | undefined };

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  // apiVersion omitted — use the SDK's pinned default to avoid type drift.
  globalForStripe.stripe ??= new Stripe(key);
  return globalForStripe.stripe;
}
