import { twiml, voiceBase, momentDuJour } from "@/lib/ivr";
import { dire } from "@/lib/ivr-langues";

export const dynamic = "force-dynamic";

// Assistant vocal conversationnel : le client PARLE, l'IA repond a voix haute.
// Reconnaissance vocale Twilio (fr-FR) -> LLM -> reponse parlee, en boucle.
async function handler(): Promise<Response> {
  const { salut } = momentDuJour();
  const xml =
    `<Gather input="speech" language="fr-FR" speechTimeout="auto" action="${voiceBase()}/assistant-reply" method="POST">` +
    dire("fr", `${salut}, je suis l'assistant vocal d'OmniComm 360. Comment puis-je vous aider ?`) +
    `</Gather>` +
    dire("fr", "Je n'ai rien entendu. Au revoir.") +
    `<Hangup/>`;
  return twiml(xml);
}

export const GET = handler;
export const POST = handler;
