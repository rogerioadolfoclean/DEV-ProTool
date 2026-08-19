import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Webhook Meta Cloud API pour les statuts WhatsApp (RF-002 / RF-021). */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token && token === process.env.META_WHATSAPP_VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as any;
  if (!body || body.object !== "whatsapp_business_account") {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const status of change.value?.statuses ?? []) {
        const providerId = String(status.id ?? "");
        const mapped = status.status === "delivered" || status.status === "read" ? "livre"
          : status.status === "failed" ? "echoue"
          : status.status === "sent" ? "envoye" : null;
        if (!providerId || !mapped) continue;
        const error = status.errors?.[0]?.title ?? status.errors?.[0]?.message ?? null;
        await pool.query(
          `UPDATE messages SET statut = $1::text,
             delivered_at = CASE WHEN $1::text = 'livre' THEN NOW() ELSE delivered_at END,
             erreur = CASE WHEN $1::text = 'echoue' THEN COALESCE($2::text, 'Échec Meta WhatsApp') ELSE erreur END
           WHERE fournisseur_id = $3::text`,
          [mapped, error, providerId]
        );
      }
    }
  }
  return NextResponse.json({ ok: true });
}
