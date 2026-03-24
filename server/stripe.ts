/**
 * Stripe service — subscription management
 * Plans: Starter $29/mo, Growth $79/mo, Pro $149/mo
 */
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-02-24.acacia",
});

// ─── Plan definitions ─────────────────────────────────────────────────────────

export const PLANS = {
  starter: {
    name: "Starter",
    price: 29,
    priceId: "price_starter", // replaced by real Stripe price ID after first run
    contentLimit: 30,         // posts per month
    features: ["30 AI posts/month", "1 practice", "Content calendar", "Basic analytics"],
  },
  growth: {
    name: "Growth",
    price: 79,
    priceId: "price_growth",
    contentLimit: 150,
    features: ["150 AI posts/month", "1 practice", "Before & After generator", "Campaign planner", "Video scripts"],
  },
  pro: {
    name: "Pro",
    price: 149,
    priceId: "price_pro",
    contentLimit: 999999, // unlimited
    features: ["Unlimited AI posts", "5 practices", "Design editor", "Priority support", "All features"],
  },
} as const;

export type PlanKey = keyof typeof PLANS;

// Tier name → plan key mapping
export function tierToPlan(tier: string): PlanKey {
  if (tier === "growth") return "growth";
  if (tier === "pro") return "pro";
  return "starter";
}

// ─── Create or retrieve Stripe customer ──────────────────────────────────────

export async function getOrCreateCustomer(userId: number, email: string, existingCustomerId?: string | null): Promise<string> {
  if (existingCustomerId) return existingCustomerId;

  const customer = await stripe.customers.create({
    email,
    metadata: { userId: String(userId) },
  });

  return customer.id;
}

// ─── Create checkout session ──────────────────────────────────────────────────

export async function createCheckoutSession(params: {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  userId: number;
}): Promise<string> {
  const session = await stripe.checkout.sessions.create({
    customer: params.customerId,
    payment_method_types: ["card"],
    mode: "subscription",
    line_items: [{ price: params.priceId, quantity: 1 }],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: { userId: String(params.userId) },
    subscription_data: {
      metadata: { userId: String(params.userId) },
    },
  });

  return session.url!;
}

// ─── Create billing portal session ───────────────────────────────────────────

export async function createBillingPortalSession(customerId: string, returnUrl: string): Promise<string> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  return session.url;
}

// ─── Map Stripe price ID → tier ──────────────────────────────────────────────

export function priceIdToTier(priceId: string): string {
  // Check env vars first (set after creating real Stripe prices)
  if (process.env.STRIPE_PRICE_STARTER && priceId === process.env.STRIPE_PRICE_STARTER) return "starter";
  if (process.env.STRIPE_PRICE_GROWTH && priceId === process.env.STRIPE_PRICE_GROWTH) return "growth";
  if (process.env.STRIPE_PRICE_PRO && priceId === process.env.STRIPE_PRICE_PRO) return "pro";

  // Fallback: scan known price IDs from Stripe metadata
  return "starter";
}

// ─── Create Stripe products and prices (run once on first deploy) ─────────────

export async function ensureStripePrices(): Promise<{ starter: string; growth: string; pro: string }> {
  // Check if we already have prices stored in env
  if (process.env.STRIPE_PRICE_STARTER && process.env.STRIPE_PRICE_GROWTH && process.env.STRIPE_PRICE_PRO) {
    return {
      starter: process.env.STRIPE_PRICE_STARTER,
      growth: process.env.STRIPE_PRICE_GROWTH,
      pro: process.env.STRIPE_PRICE_PRO,
    };
  }

  // List existing products to avoid duplicates
  const existingProducts = await stripe.products.list({ active: true });

  async function getOrCreatePrice(tierName: string, amount: number): Promise<string> {
    // Look for existing product with our metadata
    const existing = existingProducts.data.find(p => p.metadata?.hc_tier === tierName);

    let productId: string;
    if (existing) {
      productId = existing.id;
    } else {
      const product = await stripe.products.create({
        name: `HealthContent ${tierName.charAt(0).toUpperCase() + tierName.slice(1)}`,
        metadata: { hc_tier: tierName },
      });
      productId = product.id;
    }

    // List prices for this product
    const prices = await stripe.prices.list({ product: productId, active: true });
    if (prices.data.length > 0) return prices.data[0].id;

    // Create price
    const price = await stripe.prices.create({
      product: productId,
      unit_amount: amount * 100, // cents
      currency: "usd",
      recurring: { interval: "month" },
      metadata: { hc_tier: tierName },
    });
    return price.id;
  }

  const [starter, growth, pro] = await Promise.all([
    getOrCreatePrice("starter", 29),
    getOrCreatePrice("growth", 79),
    getOrCreatePrice("pro", 149),
  ]);

  console.log(`[stripe] Prices — starter: ${starter} | growth: ${growth} | pro: ${pro}`);
  console.log(`[stripe] Add to .env: STRIPE_PRICE_STARTER=${starter} STRIPE_PRICE_GROWTH=${growth} STRIPE_PRICE_PRO=${pro}`);

  return { starter, growth, pro };
}
