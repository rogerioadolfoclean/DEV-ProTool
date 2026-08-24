import { urlBase } from "@/lib/gateway";

// Configuration de l'IVR (accueil telephonique entrant) d'OmniComm 360°.
export const IVR = {
  entreprise: "OmniComm 360",
  // Numero du conseiller vers lequel rediriger l'option 1 (format E.164).
  // Configurable via IVR_FORWARD_NUMBER dans Vercel ; sinon boite vocale.
  numeroConseiller: () => process.env.IVR_FORWARD_NUMBER || "",
  langue: "fr-FR",
};

export function voiceBase(): string {
  return `${urlBase()}/api/voice`;
}

// Enveloppe une reponse TwiML (XML) avec le bon Content-Type.
export function twiml(xml: string): Response {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${xml}</Response>`, {
    headers: { "Content-Type": "text/xml; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export function say(texte: string): string {
  const safe = texte.replace(/&/g, "et").replace(/</g, "").replace(/>/g, "");
  return `<Say language="${IVR.langue}" voice="Polly.Lea">${safe}</Say>`;
}
