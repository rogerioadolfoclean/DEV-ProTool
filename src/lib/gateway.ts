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
  return {
    configuree: twilio || metaWhatsapp,
    sid,
    token,
    numero: Boolean(numero),
    numeroAffiche: numero,
    canauxReels: [
      ...(twilio ? ["sms", "voix"] : []),
      ...(metaWhatsapp ? ["whatsapp"] : []),
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

  if (canal === "whatsapp") {
    const meta = identifiantsMeta();
    if (meta) return envoyerWhatsAppMeta(vers, contenu);
  }

  const id = identifiantsTwilio();
  if (!id) return { mode: "demo", raison: canal === "whatsapp" ? "Aucune passerelle WhatsApp réelle configurée" : "Identifiants TWILIO_* absents — aucun envoi physique" };

  const corps = new URLSearchParams({
    To: canal === "whatsapp" ? `whatsapp:${vers}` : vers,
    From: canal === "whatsapp" ? `whatsapp:${id.numero}` : id.numero,
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
  const twiml = `<Response><Say language="fr-FR">${message.replace(/[<>&]/g, "")}</Say></Response>`;
  const corps = new URLSearchParams({ To: vers, From: id.numero, Twiml: twiml, StatusCallback: urlWebhookStatut(), StatusCallbackEvent: "completed" });
  return appelerTwilio(`${id.sid}/Calls.json`, corps, id.auth);
}
