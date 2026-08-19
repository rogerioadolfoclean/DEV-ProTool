import { NextResponse } from "next/server";
import twilio from "twilio";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { clientId, campaign = "AutoDialer IA" } = await req.json();
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_PHONE_NUMBER;
    const appUrl = process.env.APP_URL;
    if (!accountSid || !authToken || !from || !appUrl) return NextResponse.json({ error: "Téléphonie non configurée. Ajoutez TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER et APP_URL." }, { status: 503 });
    if (!clientId) return NextResponse.json({ error: "clientId requis" }, { status: 422 });
    const client = await pool.query(`SELECT id,name,phone FROM clients WHERE id=$1`, [clientId]);
    if (!client.rows[0]) return NextResponse.json({ error: "Client introuvable" }, { status: 404 });
    const twilioClient = twilio(accountSid, authToken);
    const call = await twilioClient.calls.create({
      to: client.rows[0].phone,
      from,
      url: `${appUrl.replace(/\/$/, "")}/api/voice/twiml?clientId=${clientId}&campaign=${encodeURIComponent(campaign)}`,
      statusCallback: `${appUrl.replace(/\/$/, "")}/api/voice/status`,
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
      statusCallbackMethod: "POST",
      method: "POST",
    });
    const inserted = await pool.query(`INSERT INTO calls (client_id,campaign,status,direction,provider,provider_call_id) VALUES ($1,$2,$3,'outbound','twilio',$4) RETURNING id`, [clientId,campaign,"initiated",call.sid]);
    return NextResponse.json({ ok:true, callSid:call.sid, callId:inserted.rows[0].id, status:call.status });
  } catch (error) {
    return NextResponse.json({ error:error instanceof Error?error.message:"Appel impossible" }, { status:500 });
  }
}
