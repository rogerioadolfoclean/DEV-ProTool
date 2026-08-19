import "server-only";

export type ResultatEmail =
  | { mode: "demo"; raison: string }
  | { mode: "reel"; statut: "envoye" | "echoue"; fournisseurId: string | null; erreur: string | null };

/** E-mail transactionnel réel via API HTTP. Aucun secret côté navigateur. */
export async function envoyerEmail(de: string, vers: string, sujet: string, contenu: string): Promise<ResultatEmail> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? de;
  if (!apiKey || !from) return { mode: "demo", raison: "RESEND_API_KEY / EMAIL_FROM absents — aucun e-mail physique" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [vers], subject: sujet || "OmniComm 360", text: contenu }),
      cache: "no-store",
    });
    const json = await res.json() as { id?: string; message?: string };
    if (!res.ok) return { mode: "reel", statut: "echoue", fournisseurId: null, erreur: `Resend ${res.status}: ${json.message ?? "erreur inconnue"}` };
    return { mode: "reel", statut: "envoye", fournisseurId: json.id ?? null, erreur: null };
  } catch (e) {
    return { mode: "reel", statut: "echoue", fournisseurId: null, erreur: e instanceof Error ? e.message : "Service e-mail injoignable" };
  }
}
