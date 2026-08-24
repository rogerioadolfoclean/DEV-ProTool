import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { pool } from "@/lib/db";
import { getStripe, stripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";

async function activerAbonnement(tenantId: number, planId: number, mode: string) {
  const up = await pool.query(
    `UPDATE abonnements SET plan_id=$2, mode=$3, statut='actif', date_debut=NOW() WHERE tenant_id=$1 RETURNING id`,
    [tenantId, planId, mode],
  );
  if (!up.rowCount) {
    await pool.query(
      `INSERT INTO abonnements (tenant_id, plan_id, mode, statut, date_debut) VALUES ($1,$2,$3,'actif',NOW())`,
      [tenantId, planId, mode],
    );
  }
}

export async function POST(req: Request) {
  if (!stripeConfigured()) {
    return NextResponse.json({ error: "stripe_non_configure" }, { status: 503 });
  }
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    if (secret && sig) {
      event = stripe.webhooks.constructEvent(raw, sig, secret);
    } else {
      // Sans secret de signature, on refuse (securite).
      return NextResponse.json({ error: "signature_secret_manquant" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: `signature_invalide: ${error instanceof Error ? error.message : "?"}` },
      { status: 400 },
    );
  }

  try {
    if (event.type === "checkout.session.completed") {
      const s = event.data.object as Stripe.Checkout.Session;
      const tenantId = Number(s.metadata?.tenantId);
      const planId = Number(s.metadata?.planId);
      const mode = s.metadata?.mode || "postpaye";
      if (tenantId && planId) await activerAbonnement(tenantId, planId, mode);
    } else if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      const tenantId = Number(sub.metadata?.tenantId);
      if (tenantId) {
        await pool.query(`UPDATE abonnements SET statut='annule' WHERE tenant_id=$1`, [tenantId]);
      }
    }
  } catch {
    // On accuse quand meme reception pour eviter les re-livraisons en boucle.
  }

  return NextResponse.json({ received: true });
}
