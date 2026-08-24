import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { exigerSession, audit } from "@/lib/auth";
import { getStripe, stripeConfigured, appBaseUrl } from "@/lib/stripe";

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
  try {
    const session = await exigerSession();
    const body = await req.json();
    const planId = Number(body.planId);
    if (!planId) return NextResponse.json({ error: "planId_requis" }, { status: 422 });

    const { rows } = await pool.query(
      `SELECT id, nom, type, prix_mensuel FROM plans_tarifaires WHERE id=$1 AND actif=true`,
      [planId],
    );
    const plan = rows[0];
    if (!plan) return NextResponse.json({ error: "plan_introuvable" }, { status: 404 });

    const prix = Number(plan.prix_mensuel);

    // Plan gratuit -> activation immediate, sans paiement.
    if (prix <= 0) {
      await activerAbonnement(session.tenantId, plan.id, plan.type);
      await audit("abonnement_gratuit_active", plan.nom, `Plan ${plan.nom}`).catch(() => {});
      return NextResponse.json({ activated: true, plan: plan.nom });
    }

    // Plan payant mais Stripe non configure -> mode demo honnete.
    if (!stripeConfigured()) {
      return NextResponse.json({
        demo: true,
        plan: plan.nom,
        message: "Paiement non actif : ajoutez STRIPE_SECRET_KEY (et STRIPE_WEBHOOK_SECRET) pour encaisser réellement.",
      });
    }

    // Checkout Stripe reel (abonnement mensuel).
    const stripe = getStripe();
    const base = appBaseUrl();
    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: Math.round(prix * 100),
          recurring: { interval: "month" },
          product_data: { name: `OmniComm 360° — Plan ${plan.nom}` },
        },
      }],
      metadata: { tenantId: String(session.tenantId), planId: String(plan.id), mode: plan.type },
      success_url: `${base}/console/facturation?paiement=succes`,
      cancel_url: `${base}/console/facturation?paiement=annule`,
    });

    await audit("checkout_stripe_cree", plan.nom, `Session ${checkout.id}`).catch(() => {});
    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "checkout_error" },
      { status: 500 },
    );
  }
}
