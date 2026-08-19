import "server-only";

export type ResultatPush =
  | { mode: "demo"; raison: string }
  | { mode: "reel"; statut: "envoye" | "echoue"; fournisseurId: string | null; erreur: string | null };

function identifiants() {
  const appId = process.env.ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;
  if (!appId || !apiKey) return null;
  return { appId, apiKey };
}

/** Envoi push réel via OneSignal REST API. Aucun secret n'est exposé au navigateur. */
export async function envoyerPush(titre: string, contenu: string, externalUserIds: string[] = []): Promise<ResultatPush> {
  const id = identifiants();
  if (!id) return { mode: "demo", raison: "ONESIGNAL_APP_ID / ONESIGNAL_REST_API_KEY absents — notification non envoyée" };
  try {
    const body: Record<string, unknown> = {
      app_id: id.appId,
      headings: { fr: titre },
      contents: { fr: contenu },
      target_channel: "push",
    };
    if (externalUserIds.length) body.include_aliases = { external_id: externalUserIds };
    else body.included_segments = ["Subscribed Users"];
    const res = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: { Authorization: `Key ${id.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const json = (await res.json()) as { id?: string; errors?: string[]; error?: string };
    if (!res.ok) return { mode: "reel", statut: "echoue", fournisseurId: null, erreur: `OneSignal ${res.status}: ${json.error ?? json.errors?.join(", ") ?? "erreur inconnue"}` };
    return { mode: "reel", statut: "envoye", fournisseurId: json.id ?? null, erreur: null };
  } catch (e) {
    return { mode: "reel", statut: "echoue", fournisseurId: null, erreur: e instanceof Error ? e.message : "Passerelle push injoignable" };
  }
}

export function pushConfigure(): boolean {
  return Boolean(process.env.ONESIGNAL_APP_ID && process.env.ONESIGNAL_REST_API_KEY);
}
