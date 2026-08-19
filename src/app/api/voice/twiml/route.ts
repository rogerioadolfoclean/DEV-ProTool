import { NextResponse } from "next/server";
import twilio from "twilio";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const clientId = url.searchParams.get("clientId");
  const campaign = url.searchParams.get("campaign") || "AutoDialer IA";
  const client = clientId ? await pool.query(`SELECT name FROM clients WHERE id=$1`, [clientId]) : null;
  const name = client?.rows[0]?.name || "client";
  const response = new twilio.twiml.VoiceResponse();
  const gather = response.gather({ input:["speech"], action:`/api/voice/respond?clientId=${clientId || ""}&campaign=${encodeURIComponent(campaign)}`, method:"POST", speechTimeout:"auto", language:"fr-FR" });
  gather.say({ language:"fr-FR", voice:"alice" }, `Bonjour ${name}. Ici l'assistant vocal de votre entreprise. Je vous appelle concernant votre rendez-vous. Êtes-vous toujours disponible ?`);
  response.say({ language:"fr-FR", voice:"alice" }, "Je n'ai pas entendu votre réponse. Nous vous rappellerons prochainement. Merci.");
  return new NextResponse(response.toString(), { headers:{"Content-Type":"text/xml"} });
}

export async function GET(req:Request){return POST(req)}
