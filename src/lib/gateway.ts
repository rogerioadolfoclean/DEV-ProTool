import "server-only";

/** Passerelles opérateur réelles (RF-001, RF-002, RF-007). */
export type ResultatPasserelle =
  | { mode: "demo"; raison: string }
  | { mode: "reel"; statut: "envoye" | "echoue"; fournisseurId: string | null; erreur: string | null };

export type EtatPasserelle = {
  configuree: boolean;
  sid: boolean;
  token: boolean;
  numero: boolean;
  numeroAffiche: string | null;
  canauxReels: string[];
};

const CANAUX_SMS = ["sms", "whatsapp"];

export function etatPasserelle(): EtatPasserelle {
  const sid = Boolean(process.env.TWILIO_ACCOUNT_SID);
  const token = Boolean(process.env.TWILIO_AUTH_TOKEN);
  const numero = process.env.TWILIO_PHONE_NUMBER ?? null;
  const twilio = sid && token && Boolean(numero);
  const metaWhatsapp = Boolean(process.env.META_WHATSAPP_ACCESS_TOKEN && process.env.META_WHATSAPP_PHONE_NUMBER_ID);
  // WhatsApp via Twilio n'est RÉEL que si un expéditeur WhatsApp dédié est configuré
  // (le numéro SMS/voix ordinaire n'est PAS un canal WhatsApp → erreur Twilio 63007).
  const twilioWhatsapp = sid && token && Boolean(process.env.TWILIO_WHATSAPP_FROM);
  const whatsappReel = metaWhatsapp || twilioWhatsapp;
  return {
    configuree: twilio || whatsappReel,
    sid,
    token,
    numero: Boolean(numero),
    numeroAffiche: numero,
    canauxReels: [
      ...(twilio ? ["sms", "voix"] : []),
      ...(whatsappReel ? ["whatsapp"] : []),
    ],
  };
}

export function passerelleConfiguree(): boolean {
  return etatPasserelle().configuree;
}

function identifiantsTwilio() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const numero = process.env.TWILIO_PHONE_NUMBER;
  if (!sid || !token || !numero) return null;
  return { sid, numero, auth: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64") };
}

/** Normalise un numéro au format E.164 (retire whatsapp:, espaces, tirets, parenthèses). */
export function numeroE164(v: string): string {
  return v.replace(/^whatsapp:/i, "").replace(/[\s()\-.]/g, "").trim();
}

/** Valide un numéro international E.164 : + puis 8 à 15 chiffres, ne commençant pas par 0. */
export function numeroValide(v: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(numeroE164(v));
}

/** Expéditeur WhatsApp Twilio (numéro approuvé ou sandbox « whatsapp:+14155238886 »).
 *  Le numéro SMS/voix ordinaire n'est PAS un canal WhatsApp valide. */
function twilioWhatsAppFrom(): string | null {
  const f = process.env.TWILIO_WHATSAPP_FROM?.trim();
  if (!f) return null;
  return f.startsWith("whatsapp:") ? f : `whatsapp:${f.replace(/\s+/g, "")}`;
}

function identifiantsMeta() {
  const token = process.env.META_WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) return null;
  return {
    token,
    phoneNumberId,
    version: process.env.META_GRAPH_API_VERSION ?? "v23.0",
  };
}

export function urlBase(): string {
  // Alias PUBLIC stable requis pour les callbacks externes (Twilio TwiML/StatusCallback,
  // webhooks Meta). VERCEL_URL est specifique au deploiement et protege -> inutilisable
  // par un tiers, donc on ne l'utilise PAS ici.
  const explicite = process.env.APP_BASE_URL ?? process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (explicite) return explicite.replace(/\/$/, "");
  return "https://omnicomm-360.vercel.app";
}

export function urlWebhookStatut(): string {
  return `${urlBase()}/api/webhooks/twilio`;
}

export function urlWebhookMeta(): string {
  return `${urlBase()}/api/webhooks/meta`;
}

async function appelerTwilio(chemin: string, corps: URLSearchParams, auth: string): Promise<ResultatPasserelle> {
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${chemin}`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/x-www-form-urlencoded" },
      body: corps,
      cache: "no-store",
    });
    const json = (await res.json()) as { sid?: string; message?: string; code?: number };
    if (!res.ok) return { mode: "reel", statut: "echoue", fournisseurId: null, erreur: `Twilio ${res.status}${json.code ? ` (code ${json.code})` : ""} : ${json.message ?? "erreur inconnue"}` };
    return { mode: "reel", statut: "envoye", fournisseurId: json.sid ?? null, erreur: null };
  } catch (e) {
    return { mode: "reel", statut: "echoue", fournisseurId: null, erreur: e instanceof Error ? e.message : "Passerelle injoignable" };
  }
}

/** WhatsApp réel via Meta Cloud API. Le webhook Meta doit être configuré sur l'application Meta. */
async function envoyerWhatsAppMeta(vers: string, contenu: string): Promise<ResultatPasserelle> {
  const id = identifiantsMeta();
  if (!id) return { mode: "demo", raison: "META_WHATSAPP_ACCESS_TOKEN / META_WHATSAPP_PHONE_NUMBER_ID absents — aucun envoi physique WhatsApp" };
  const numero = vers.replace(/^whatsapp:/i, "").replace(/\s+/g, "");
  try {
    const res = await fetch(`https://graph.facebook.com/${id.version}/${id.phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${id.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: numero,
        type: "text",
        text: { preview_url: false, body: contenu },
      }),
      cache: "no-store",
    });
    const json = (await res.json()) as { messages?: Array<{ id?: string }>; error?: { message?: string; code?: number } };
    if (!res.ok) return { mode: "reel", statut: "echoue", fournisseurId: null, erreur: `Meta ${res.status}${json.error?.code ? ` (code ${json.error.code})` : ""} : ${json.error?.message ?? "erreur inconnue"}` };
    return { mode: "reel", statut: "envoye", fournisseurId: json.messages?.[0]?.id ?? null, erreur: null };
  } catch (e) {
    return { mode: "reel", statut: "echoue", fournisseurId: null, erreur: e instanceof Error ? e.message : "Passerelle Meta injoignable" };
  }
}

/** Envoi réel SMS/WhatsApp. WhatsApp privilégie Meta Cloud API lorsqu'elle est configurée. */
export async function envoyerViaPasserelle(canal: string, vers: string, contenu: string): Promise<ResultatPasserelle> {
  if (!CANAUX_SMS.includes(canal)) return { mode: "demo", raison: `Canal ${canal} sans passerelle réelle configurée` };

  // Validation locale AVANT tout appel réseau : évite les échecs Twilio garantis
  // (21211 numéro invalide, 21614 non mobile) sur des numéros mal formés.
  const dest = numeroE164(vers);
  if (!numeroValide(dest)) {
    return { mode: "reel", statut: "echoue", fournisseurId: null, erreur: `Numéro destinataire invalide : « ${vers} » — format international requis (ex. +243811234567).` };
  }

  // WhatsApp : Meta Cloud API en priorité, sinon expéditeur WhatsApp Twilio dédié.
  if (canal === "whatsapp") {
    const meta = identifiantsMeta();
    if (meta) return envoyerWhatsAppMeta(vers, contenu);

    const waFrom = twilioWhatsAppFrom();
    const idTw = identifiantsTwilio();
    if (!waFrom || !idTw) {
      // Aucun canal WhatsApp réel : on NE tente PAS un envoi Twilio voué à l'échec (63007).
      return { mode: "demo", raison: "Aucun expéditeur WhatsApp réel configuré (Meta Cloud API ou TWILIO_WHATSAPP_FROM) — message non envoyé physiquement" };
    }
    const corpsWa = new URLSearchParams({
      To: `whatsapp:${vers.replace(/^whatsapp:/i, "").replace(/\s+/g, "")}`,
      From: waFrom,
      Body: contenu,
      StatusCallback: urlWebhookStatut(),
      StatusCallbackEvent: "queued,sent,delivered,undelivered,failed",
    });
    return appelerTwilio(`${idTw.sid}/Messages.json`, corpsWa, idTw.auth);
  }

  // SMS réel via Twilio.
  const id = identifiantsTwilio();
  if (!id) return { mode: "demo", raison: "Identifiants TWILIO_* absents — aucun envoi physique" };
  if (dest === numeroE164(id.numero)) {
    return { mode: "reel", statut: "echoue", fournisseurId: null, erreur: "Le destinataire ne peut pas être le numéro émetteur." };
  }

  const corps = new URLSearchParams({
    To: dest,
    From: id.numero,
    Body: contenu,
    StatusCallback: urlWebhookStatut(),
    StatusCallbackEvent: "queued,sent,delivered,undelivered,failed",
  });
  return appelerTwilio(`${id.sid}/Messages.json`, corps, id.auth);
}

/** Lancement réel d'un appel vocal (RF-007). */
export async function appelerViaPasserelle(vers: string, message: string): Promise<ResultatPasserelle> {
  const id = identifiantsTwilio();
  if (!id) return { mode: "demo", raison: "Identifiants TWILIO_* absents — aucun appel physique" };
  const dest = numeroE164(vers);
  if (!numeroValide(dest)) return { mode: "reel", statut: "echoue", fournisseurId: null, erreur: `Numéro invalide : « ${vers} » — format international requis (ex. +243811234567).` };
  if (dest === numeroE164(id.numero)) return { mode: "reel", statut: "echoue", fournisseurId: null, erreur: "Le destinataire ne peut pas être le numéro émetteur." };
  const twiml = `<Response><Say language="fr-FR">${message.replace(/[<>&]/g, "")}</Say></Response>`;
  const corps = new URLSearchParams({ To: dest, From: id.numero, Twiml: twiml, StatusCallback: urlWebhookStatut(), StatusCallbackEvent: "completed" });
  return appelerTwilio(`${id.sid}/Calls.json`, corps, id.auth);
}
