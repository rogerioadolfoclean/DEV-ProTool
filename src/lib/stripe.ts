import Stripe from "stripe";

// Client Stripe paresseux, gate sur STRIPE_SECRET_KEY.
// Tant que la cle n'est pas fournie, le systeme reste en mode demo
// (aucun paiement reel) — meme principe que les autres passerelles.
let cached: Stripe | null = null;

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY manquante");
  if (!cached) cached = new Stripe(key);
  return cached;
}

export function appBaseUrl(): string {
  return process.env.APP_BASE_URL || "https://omnicomm-360.vercel.app";
}
