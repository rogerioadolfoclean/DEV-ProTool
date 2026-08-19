import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
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

function signatureValide(raw: string, signature: string | null): boolean {
  const secret = process.env.META_APP_SECRET;
  if (!secret || !signature?.startsWith("sha256=")) return false;
  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(raw, "utf8").digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!signatureValide(raw, req.headers.get("x-hub-signature-256"))) {
    return new NextResponse("Signature Meta invalide", { status: 403 });
  }
  const body = JSON.parse(raw) as any;
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
