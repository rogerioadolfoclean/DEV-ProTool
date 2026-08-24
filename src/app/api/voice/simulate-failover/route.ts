import { NextResponse } from "next/server";
import twilio from "twilio";
import { pool } from "@/lib/db";
import { exigerSession } from "@/lib/auth";
import { urlBase } from "@/lib/gateway";
import { IVR } from "@/lib/ivr";

export const dynamic = "force-dynamic";

// Simulation : la plateforme appelle le numero PRINCIPAL (maison). S'il ne
// repond pas, le webhook simulate-status bascule vers le SECONDAIRE (cellulaire).
export async function POST(req: Request) {
  try {
    await exigerSession();
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_PHONE_NUMBER;
    if (!accountSid || !authToken || !from) return NextResponse.json({ error: "Téléphonie non configurée." }, { status: 503 });

    const body = await req.json().catch(() => ({}));
    const principal = (typeof body.principal === "string" && body.principal) || IVR.numeroConseiller();
    const secondaire = (typeof body.secondaire === "string" && body.secondaire) || IVR.numeroFailover();
    const base = urlBase();

    const call = await twilio(accountSid, authToken).calls.create({
      to: principal,
      from,
      timeout: 20, // 20s sans decrocher -> no-answer -> bascule
      url: `${base}/api/voice/simulate-say?leg=principal`,
      statusCallback: `${base}/api/voice/simulate-status?leg=principal&failover=${encodeURIComponent(secondaire)}`,
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
      statusCallbackMethod: "POST",
      method: "POST",
    });

    await pool.query(
      `INSERT INTO calls (campaign, status, direction, provider, provider_call_id, phone_number)
       VALUES ('Simulation bascule (principal)', 'initiated', 'outbound', 'twilio', $1, $2)`,
      [call.sid, principal],
    );

    return NextResponse.json({ ok: true, principal, secondaire, callSid: call.sid });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Simulation impossible" }, { status: 500 });
  }
}
