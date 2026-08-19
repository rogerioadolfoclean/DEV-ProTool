import { NextResponse } from "next/server";
import twilio from "twilio";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Lance un appel AutoDialer IA et conserve les données géographiques du contact. */
export async function POST(req: Request) {
  try {
    const { clientId, campaign = "AutoDialer IA" } = await req.json();
    if (!clientId) return NextResponse.json({ error: "clientId requis" }, { status: 422 });

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_PHONE_NUMBER;
    const appUrl = process.env.APP_URL;
    if (!accountSid || !authToken || !from || !appUrl) return NextResponse.json({ error: "Téléphonie non configurée." }, { status: 503 });

    const result = await pool.query(`SELECT id,name,phone,city,country,status FROM clients WHERE id=$1`, [clientId]);
    const c = result.rows[0];
    if (!c) return NextResponse.json({ error: "Client introuvable" }, { status: 404 });
    if (c.status !== "active") return NextResponse.json({ error: "Client non actif" }, { status: 409 });
    if (!c.phone) return NextResponse.json({ error: "Numéro absent" }, { status: 422 });

    const base = appUrl.replace(/\/$/, "");
    const call = await twilio(accountSid, authToken).calls.create({
      to: c.phone, from,
      url: `${base}/api/voice/twiml?clientId=${c.id}&campaign=${encodeURIComponent(campaign)}`,
      statusCallback: `${base}/api/voice/status`,
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
      statusCallbackMethod: "POST", method: "POST",
    });

    const inserted = await pool.query(
      `INSERT INTO calls (client_id,campaign,status,direction,provider,provider_call_id,phone_number,city,country)
       VALUES ($1,$2,$3,'outbound','twilio',$4,$5,$6,$7) RETURNING id`,
      [c.id,campaign,"initiated",call.sid,c.phone,c.city ?? null,c.country ?? null],
    );
    await pool.query(`UPDATE clients SET last_contact_at=NOW() WHERE id=$1`, [c.id]);

    return NextResponse.json({ ok:true, clientId:c.id, name:c.name, phone:c.phone, city:c.city, country:c.country, callId:inserted.rows[0].id, callSid:call.sid });
  } catch (error) {
    return NextResponse.json({ error:error instanceof Error?error.message:"Appel impossible" }, { status:500 });
  }
}
