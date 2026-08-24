import { urlBase } from "@/lib/gateway";

// Configuration de l'IVR (accueil telephonique entrant) d'OmniComm 360°.
export const IVR = {
  entreprise: "OmniComm 360",
  // Numero PRINCIPAL qui recoit les appels (option 1 "conseiller").
  // Defaut = ligne maison de Rogerio (Rio) ; surchargeable via IVR_FORWARD_NUMBER.
  numeroConseiller: () => process.env.IVR_FORWARD_NUMBER || "+552121473427",
  // Numero de BASCULE si le principal ne repond pas ; surchargeable via IVR_FORWARD_FALLBACK.
  numeroFailover: () => process.env.IVR_FORWARD_FALLBACK || "+5521990645151",
  langue: "fr-FR",
};

export function voiceBase(): string {
  return `${urlBase()}/api/voice`;
}

// Moment de la journee selon l'heure locale (fuseau configurable IVR_TIMEZONE,
// defaut Afrique/Kinshasa pour la RDC). Sert a saluer comme un humain.
export function momentDuJour(): { salut: string; moment: string; heure: string } {
  const tz = process.env.IVR_TIMEZONE || "Africa/Kinshasa";
  const now = new Date();
  const h = Number(new Intl.DateTimeFormat("fr-FR", { timeZone: tz, hour: "2-digit", hour12: false }).format(now));
  const heure = new Intl.DateTimeFormat("fr-FR", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(now);
  if (h >= 5 && h < 12) return { salut: "Bonjour", moment: "le matin", heure };
  if (h >= 12 && h < 18) return { salut: "Bon apres-midi", moment: "l'apres-midi", heure };
  if (h >= 18 && h < 23) return { salut: "Bonsoir", moment: "le soir", heure };
  return { salut: "Bonsoir", moment: "la nuit (heure tardive)", heure };
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
