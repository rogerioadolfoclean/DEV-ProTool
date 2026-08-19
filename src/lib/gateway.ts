import "server-only";

/**
 * Passerelle opérateur réelle (RF-001, RF-002, RF-007).
 *
 * Si les variables TWILIO_* sont configurées, les SMS, WhatsApp et appels
 * partent réellement via Twilio. Sinon la plateforme reste en mode
 * démonstration : l'enregistrement, le routage Least-Cost, la conformité DND
 * et le CDR sont réels, mais AUCUN envoi physique n'a lieu — le statut
 * résultant est alors « simule », jamais « livre ».
 */

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
  const configuree = sid && token && Boolean(numero);
  return {
    configuree,
    sid,
    token,
    numero: Boolean(numero),
    numeroAffiche: numero,
    canauxReels: configuree ? ["sms", "whatsapp", "voix"] : [],
  };
}

export function passerelleConfiguree(): boolean {
  return etatPasserelle().configuree;
}

function identifiants() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const numero = process.env.TWILIO_PHONE_NUMBER;
  if (!sid || !token || !numero) return null;
  return {
    sid,
    numero,
    auth: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
  };
}

/** URL de base publique de la plateforme (pour les rappels Twilio). */
export function urlBase(): string {
  const explicite = process.env.APP_BASE_URL ?? process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (explicite) return explicite.replace(/\/$/, "");

  // Vercel fournit VERCEL_URL sans protocole. Cela évite d'envoyer les
  // callbacks Twilio vers une URL locale ou une ancienne URL de production.
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;

  return "https://omnicomm-360.vercel.app";
}

/** URL du webhook qui reçoit les mises à jour de statut de livraison. */
export function urlWebhookStatut(): string {
  return `${urlBase()}/api/webhooks/twilio`;
}

async function appelerTwilio(
  chemin: string,
  corps: URLSearchParams,
  auth: string
): Promise<ResultatPasserelle> {
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${chemin}`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/x-www-form-urlencoded" },
      body: corps,
      cache: "no-store",
    });
    const json = (await res.json()) as { sid?: string; message?: string; code?: number };
    if (!res.ok) {
      return {
        mode: "reel",
        statut: "echoue",
        fournisseurId: null,
        erreur: `Twilio ${res.status}${json.code ? ` (code ${json.code})` : ""} : ${json.message ?? "erreur inconnue"}`,
      };
    }
    return { mode: "reel", statut: "envoye", fournisseurId: json.sid ?? null, erreur: null };
  } catch (e) {
    return {
      mode: "reel",
      statut: "echoue",
      fournisseurId: null,
      erreur: e instanceof Error ? e.message : "Passerelle injoignable",
    };
  }
}

/** Envoi réel d'un SMS ou WhatsApp (RF-001, RF-002). */
export async function envoyerViaPasserelle(
  canal: string,
  vers: string,
  contenu: string
): Promise<ResultatPasserelle> {
  if (!CANAUX_SMS.includes(canal)) {
    return { mode: "demo", raison: `Canal ${canal} sans passerelle réelle configurée` };
  }
  const id = identifiants();
  if (!id) {
    return { mode: "demo", raison: "Identifiants TWILIO_* absents — aucun envoi physique" };
  }
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
export async function appelerViaPasserelle(
  vers: string,
  message: string
): Promise<ResultatPasserelle> {
  const id = identifiants();
  if (!id) {
    return { mode: "demo", raison: "Identifiants TWILIO_* absents — aucun appel physique" };
  }
  const twiml = `<Response><Say language="fr-FR">${message.replace(/[<>&]/g, "")}</Say></Response>`;
  const corps = new URLSearchParams({
    To: vers,
    From: id.numero,
    Twiml: twiml,
    StatusCallback: urlWebhookStatut(),
    StatusCallbackEvent: "completed",
  });
  return appelerTwilio(`${id.sid}/Calls.json`, corps, id.auth);
}
