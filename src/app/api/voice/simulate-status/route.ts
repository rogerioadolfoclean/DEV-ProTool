import { NextResponse } from "next/server";
import twilio from "twilio";
import { pool } from "@/lib/db";
import { urlBase } from "@/lib/gateway";

export const dynamic = "force-dynamic";

const SANS_REPONSE = ["no-answer", "busy", "failed", "canceled"];

// Recoit le statut du leg PRINCIPAL. Si pas de reponse -> appelle le SECONDAIRE.
export async function POST(req: Request) {
  const url = new URL(req.url);
  const leg = url.searchParams.get("leg") || "principal";
  const failover = url.searchParams.get("failover") || "";
  const form = await req.formData();
  const status = String(form.get("CallStatus") || "");
  const sid = String(form.get("CallSid") || "");

  if (sid) {
    try { await pool.query(`UPDATE calls SET status=$1 WHERE provider_call_id=$2`, [status, sid]); } catch { /* ignore */ }
  }

  // Bascule : uniquement depuis le principal, quand il ne repond pas.
  if (leg === "principal" && failover && SANS_REPONSE.includes(status)) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_PHONE_NUMBER;
    if (accountSid && authToken && from) {
      try {
        const base = urlBase();
        const call = await twilio(accountSid, authToken).calls.create({
          to: failover,
          from,
          timeout: 25,
          url: `${base}/api/voice/simulate-say?leg=secondaire`,
          statusCallback: `${base}/api/voice/simulate-status?leg=secondaire`,
          statusCallbackEvent: ["completed"],
          statusCallbackMethod: "POST",
          method: "POST",
        });
        await pool.query(
          `INSERT INTO calls (campaign, status, direction, provider, provider_call_id, phone_number)
           VALUES ('Simulation bascule (secondaire)', 'initiated', 'outbound', 'twilio', $1, $2)`,
          [call.sid, failover],
        );
      } catch { /* ignore */ }
    }
  }

  return NextResponse.json({ ok: true });
}
