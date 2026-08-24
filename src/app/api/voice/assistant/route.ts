import { twiml, voiceBase } from "@/lib/ivr";
import { dire } from "@/lib/ivr-langues";

export const dynamic = "force-dynamic";

// Assistant vocal conversationnel : le client PARLE, l'IA repond a voix haute.
// Reconnaissance vocale Twilio (fr-FR) -> LLM -> reponse parlee, en boucle.
async function handler(): Promise<Response> {
  const xml =
    `<Gather input="speech" language="fr-FR" speechTimeout="auto" action="${voiceBase()}/assistant-reply" method="POST">` +
    dire("fr", "Bonjour, je suis l'assistant vocal d'OmniComm 360. Posez-moi votre question apres le bip. Comment puis-je vous aider ?") +
    `</Gather>` +
    dire("fr", "Je n'ai rien entendu. Au revoir.") +
    `<Hangup/>`;
  return twiml(xml);
}

export const GET = handler;
export const POST = handler;
