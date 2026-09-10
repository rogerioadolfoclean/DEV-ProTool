import "server-only";

/**
 * Géolocalisation cellulaire RÉELLE (RF-013).
 *
 * Résout la position d'un équipement à partir des antennes GSM/LTE qui le voient
 * (MCC/MNC/LAC/CID + puissance signal) via une base d'antennes réelle
 * (Unwired Labs / OpenCelliD). Plusieurs cellules => triangulation multi-cellules.
 *
 * HONNÊTETÉ : sans clé fournisseur configurée, on NE fabrique JAMAIS de coordonnées.
 * On renvoie { mode: "demo" } et l'appelant n'enregistre rien.
 */

export type Cellule = { lac: number; cid: number; signal?: number };

export type ResultatGeoloc =
  | { mode: "demo"; raison: string }
  | {
      mode: "reel";
      statut: "ok" | "echoue";
      latitude: number | null;
      longitude: number | null;
      precision_m: number | null;
      source: string | null;
      erreur: string | null;
    };

/** Vrai si un fournisseur de localisation cellulaire est configuré. */
export function geolocationConfiguree(): boolean {
  return Boolean(process.env.UNWIREDLABS_API_KEY);
}

/** Point d'accès régional Unwired Labs (us1 par défaut, surchargé par env). */
function endpointUnwired(): string {
  return process.env.UNWIREDLABS_ENDPOINT?.replace(/\/$/, "") ?? "https://us1.unwiredlabs.com";
}

/**
 * Résout une position à partir des cellules serveuses.
 * @param radio "gsm" | "lte" | "umts" | "cdma"
 */
export async function resoudrePosition(
  radio: string,
  mcc: number,
  mnc: number,
  cells: Cellule[]
): Promise<ResultatGeoloc> {
  const token = process.env.UNWIREDLABS_API_KEY;
  if (!token) {
    return {
      mode: "demo",
      raison:
        "UNWIREDLABS_API_KEY absente — aucune résolution cellulaire réelle. Positions non calculées (aucune donnée inventée).",
    };
  }
  if (!cells.length) {
    return { mode: "reel", statut: "echoue", latitude: null, longitude: null, precision_m: null, source: null, erreur: "Aucune cellule fournie (lac/cid requis)." };
  }

  try {
    const res = await fetch(`${endpointUnwired()}/v2/process.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        radio: radio || "gsm",
        mcc,
        mnc,
        cells: cells.map((c) => ({ lac: c.lac, cid: c.cid, signal: c.signal ?? -80 })),
        address: 0,
      }),
      cache: "no-store",
    });
    const json = (await res.json()) as {
      status?: string;
      lat?: number;
      lon?: number;
      accuracy?: number;
      message?: string;
    };
    if (json.status !== "ok" || typeof json.lat !== "number" || typeof json.lon !== "number") {
      return {
        mode: "reel",
        statut: "echoue",
        latitude: null,
        longitude: null,
        precision_m: null,
        source: null,
        erreur: `Fournisseur cellulaire : ${json.message ?? "position introuvable pour ces cellules"}`,
      };
    }
    return {
      mode: "reel",
      statut: "ok",
      latitude: json.lat,
      longitude: json.lon,
      precision_m: json.accuracy != null ? Math.round(json.accuracy) : null,
      source: cells.length > 1 ? "triangulation multi-cellules" : "cellule serveuse",
      erreur: null,
    };
  } catch (e) {
    return {
      mode: "reel",
      statut: "echoue",
      latitude: null,
      longitude: null,
      precision_m: null,
      source: null,
      erreur: e instanceof Error ? e.message : "Fournisseur cellulaire injoignable",
    };
  }
}
