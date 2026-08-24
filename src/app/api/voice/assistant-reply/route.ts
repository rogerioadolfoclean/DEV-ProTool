import { pool } from "@/lib/db";
import { twiml, voiceBase } from "@/lib/ivr";
import { dire } from "@/lib/ivr-langues";
import { generateAiText, normalizeAiProvider } from "@/lib/ai-provider";

export const dynamic = "force-dynamic";

const SYSTEME =
  "Tu es l'assistant vocal telephonique d'OmniComm 360, une plateforme de communication (SMS, WhatsApp, appels, IoT, radio web) en RDC et en Afrique. " +
  "Tu PARLES au telephone : reponses TRES BREVES (1 a 2 phrases), naturelles, orales, en francais. " +
  "Aide le client : renseigne sur les services, oriente, prends note d'une demande. " +
  "N'invente jamais de prix, de delais ou d'informations personnelles. Si tu ne sais pas, propose de laisser un message ou de rappeler.";

const AUREVOIR = /\b(au revoir|c'?est tout|merci beaucoup|termin|raccroch|bye|tchao|adieu)\b/i;

function ecouter(): string {
  return `<Gather input="speech" language="fr-FR" speechTimeout="auto" action="${voiceBase()}/assistant-reply" method="POST"></Gather>` +
    dire("fr", "Je n'ai plus rien entendu. Au revoir.") + `<Hangup/>`;
}

export async function POST(req: Request): Promise<Response> {
  const form = await req.formData();
  const speech = String(form.get("SpeechResult") || "").trim();
  const sid = String(form.get("CallSid") || "");

  if (!speech) {
    return twiml(dire("fr", "Je n'ai pas bien entendu, pouvez-vous repeter ?") + ecouter());
  }

  if (AUREVOIR.test(speech)) {
    return twiml(dire("fr", "Merci d'avoir appele OmniComm 360. Bonne journee, au revoir !") + `<Hangup/>`);
  }

  // Historique du dialogue (memoire de l'appel).
  let historique = "";
  if (sid) {
    try {
      const r = await pool.query(`SELECT dialogue FROM calls WHERE provider_call_id=$1`, [sid]);
      historique = r.rows[0]?.dialogue || "";
    } catch { /* ignore */ }
  }

  const prompt = `${historique}Client: ${speech}\nAssistant:`;
  let reponse = "";
  try {
    const out = await generateAiText({ provider: normalizeAiProvider("gemini"), system: SYSTEME, prompt, maxTokens: 160 });
    reponse = (out.text || "").trim();
  } catch {
    reponse = "";
  }
  if (!reponse) reponse = "Je rencontre une difficulte technique. Souhaitez-vous laisser un message ?";

  // Sauvegarde le fil pour garder le contexte au tour suivant.
  if (sid) {
    const maj = `${prompt} ${reponse}\n`;
    try {
      await pool.query(
        `UPDATE calls SET dialogue=$1, outcome='dialogue_ia' WHERE provider_call_id=$2`,
        [maj.slice(-4000), sid],
      );
    } catch { /* ignore */ }
  }

  return twiml(dire("fr", reponse) + ecouter());
}
