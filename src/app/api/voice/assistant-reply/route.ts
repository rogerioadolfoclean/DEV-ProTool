import { pool } from "@/lib/db";
import { twiml, voiceBase, momentDuJour } from "@/lib/ivr";
import { dire } from "@/lib/ivr-langues";
import { generateAiText, normalizeAiProvider } from "@/lib/ai-provider";

export const dynamic = "force-dynamic";

const SYSTEME =
  "Tu es l'assistant vocal telephonique d'OmniComm 360, plateforme de communication (SMS, WhatsApp, appels vocaux, IoT, radio web) en RDC et en Afrique. " +
  "Tu PARLES au telephone. Regles STRICTES: reponds en francais, en UNE seule phrase courte et naturelle (maximum 25 mots), sans liste, sans puces, sans symboles, sans emoji, sans saut de ligne. " +
  "Donne une information utile ou pose une question pour aider. Reponds TOUJOURS a la demande du client: s'il salue, salue en un mot puis reponds a sa question dans la meme phrase, ne te contente jamais de dire seulement bonjour. N'invente jamais de prix ni de delais. Si tu ne sais pas, propose de laisser un message.";

const AUREVOIR = /\b(au revoir|c'?est tout|merci beaucoup|termine|termin[eé]|raccroch|au-revoir|bye|tchao|adieu)\b/i;

// Nettoie la reponse pour la voix : une seule ligne, sans markdown ni symboles.
function pourLaVoix(t: string): string {
  let s = t.replace(/[\r\n]+/g, " ")
    .replace(/[*_#>`~•\-]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  // Garde la premiere phrase si le modele en produit plusieurs.
  const pts = s.split(/(?<=[.!?])\s/);
  if (pts.length > 2) s = pts.slice(0, 2).join(" ");
  return s.slice(0, 300).trim();
}

function ecouter(): string {
  return `<Gather input="speech" language="fr-FR" speechTimeout="auto" action="${voiceBase()}/assistant-reply" method="POST"></Gather>` +
    dire("fr", "Je n'ai plus rien entendu. Merci d'avoir appele OmniComm 360. Au revoir.") + `<Hangup/>`;
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

  // Historique lisible (derniers echanges) pour garder le contexte.
  let histo = "";
  if (sid) {
    try {
      const r = await pool.query(`SELECT dialogue FROM calls WHERE provider_call_id=$1`, [sid]);
      histo = r.rows[0]?.dialogue || "";
    } catch { /* ignore */ }
  }

  const { salut, moment, heure } = momentDuJour();
  const prompt =
    `Contexte: il est ${heure}, nous sommes ${moment}. Salue en respectant ce moment (matin: Bonjour ; apres-midi: Bon apres-midi ; soir ou nuit: Bonsoir), comme un humain, uniquement au premier echange.\n` +
    (histo ? `Conversation jusqu'ici:\n${histo}\n` : `Salutation adaptee attendue: "${salut}".\n`) +
    `Le client vient de dire: "${speech}".\n` +
    `Donne UNIQUEMENT ta reponse orale (une phrase courte, sans prefixe).`;

  let reponse = "";
  try {
    // Claude par defaut (qualite) ; basculable via IVR_AI_PROVIDER=gemini (gratuit).
    const out = await generateAiText({ provider: normalizeAiProvider(process.env.IVR_AI_PROVIDER || "claude"), system: SYSTEME, prompt, maxTokens: 300 });
    reponse = pourLaVoix(out.text || "");
  } catch { reponse = ""; }
  if (!reponse) reponse = "Pouvez-vous preciser votre demande, ou souhaitez-vous laisser un message ?";

  if (sid) {
    const ligne = `Client: ${speech}\nAssistant: ${reponse}\n`;
    try {
      await pool.query(
        `UPDATE calls SET dialogue = COALESCE(right(COALESCE(dialogue,''), 2500), '') || $1, outcome='dialogue_ia' WHERE provider_call_id=$2`,
        [ligne, sid],
      );
    } catch { /* ignore */ }
  }

  return twiml(dire("fr", reponse) + ecouter());
}
