import { NextResponse } from "next/server";
import twilio from "twilio";
import { pool } from "@/lib/db";
import { exigerSession } from "@/lib/auth";
import { urlBase } from "@/lib/gateway";

export const dynamic = "force-dynamic";

// Appelle un numero et le connecte a l'IVR d'accueil (pour tester le menu
// multilingue "cote client" sans avoir configure le webhook entrant Twilio).
export async function POST(req: Request) {
  try {
    await exigerSession();
    const body = await req.json();
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_PHONE_NUMBER;
    if (!accountSid || !authToken || !from) {
      return NextResponse.json({ error: "Téléphonie non configurée." }, { status: 503 });
    }

    let phone = typeof body.phone === "string" ? body.phone.trim() : "";
    if (!phone && body.clientId) {
      const r = await pool.query(`SELECT phone FROM clients WHERE id=$1`, [Number(body.clientId)]);
      phone = r.rows[0]?.phone || "";
    }
    if (!phone) return NextResponse.json({ error: "phone ou clientId requis" }, { status: 422 });

    const base = urlBase();
    const call = await twilio(accountSid, authToken).calls.create({
      to: phone,
      from,
      url: `${base}/api/voice/incoming`,   // <-- IVR d'accueil au decroche
      statusCallback: `${base}/api/voice/status`,
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
      statusCallbackMethod: "POST",
      method: "POST",
    });

    await pool.query(
      `INSERT INTO calls (campaign, status, direction, provider, provider_call_id, phone_number)
       VALUES ('Test IVR', 'initiated', 'outbound', 'twilio', $1, $2)`,
      [call.sid, phone],
    );

    return NextResponse.json({ ok: true, phone, callSid: call.sid });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Appel impossible" }, { status: 500 });
  }
}
