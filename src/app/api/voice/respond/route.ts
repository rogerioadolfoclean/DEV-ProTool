import { NextResponse } from "next/server";
import twilio from "twilio";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req:Request){
 const form=await req.formData(); const speech=String(form.get("SpeechResult")||""); const clientId=new URL(req.url).searchParams.get("clientId"); const campaign=new URL(req.url).searchParams.get("campaign")||"AutoDialer IA";
 let intent="unknown"; let reply="Merci pour votre réponse. Un conseiller va traiter votre demande.";
 if(/vendredi|demain|lundi|mardi|mercredi|jeudi|samedi|dimanche|heure|rendez-vous|disponible/i.test(speech)){intent="appointment";reply="Très bien. Votre demande de rendez-vous a été enregistrée. Merci et bonne journée."}
 if(/non|pas disponible|annul/i.test(speech)){intent="not_available";reply="D'accord. Nous avons enregistré votre indisponibilité. Nous vous recontacterons."}
 if(/oui|disponible|d'accord/i.test(speech)){intent="confirmed";reply="Parfait. Nous confirmons votre disponibilité. Merci et bonne journée."}
 if(clientId){await pool.query(`UPDATE calls SET intent=$1, transcript=COALESCE(transcript,'') || $2, ai_summary=$3 WHERE id=(SELECT id FROM calls WHERE client_id=$4 AND campaign=$5 AND status IN ('initiated','ringing','in_progress') ORDER BY started_at DESC LIMIT 1)`,[intent,` Client: ${speech}`,reply,clientId,campaign]);}
 const response=new twilio.twiml.VoiceResponse(); response.say({language:"fr-FR",voice:"alice"},reply); response.hangup(); return new NextResponse(response.toString(),{headers:{"Content-Type":"text/xml"}});
}
