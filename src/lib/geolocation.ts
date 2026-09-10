import "server-only";
import { pool } from "./db";

/**
 * Géolocalisation cellulaire RÉELLE (RF-013) — 100% NOTRE propre API.
 *
 * On héberge NOTRE base d'antennes (table `cell_towers`, alimentée par les données
 * ouvertes OpenCelliD filtrées sur nos marchés) et on calcule la position NOUS-MÊMES
 * (triangulation par barycentre pondéré). Aucune dépendance à un fournisseur tiers,
 * aucun coût par requête → l'endpoint /api/v1/geolocation est NOTRE produit payant.
 *
 * HONNÊTETÉ : si une antenne n'est pas dans notre base, on ne devine pas — on le dit.
 */

export type Cellule = { lac: number; cid: number; signal?: number };

export type ResultatGeoloc = {
  statut: "ok" | "echoue";
  latitude: number | null;
  longitude: number | null;
  precision_m: number | null;
  source: string | null;
  cellules_resolues: number;
  cellules_totales: number;
  erreur: string | null;
};

/** Nombre d'antennes chargées dans NOTRE base (par pays optionnel via MCC). */
export async function baseAntennesInfo(): Promise<{ total: number; parPays: { mcc: number; n: number }[] }> {
  try {
    const [tot, pays] = await Promise.all([
      pool.query(`SELECT COUNT(*)::bigint AS n FROM cell_towers`),
      pool.query(`SELECT mcc, COUNT(*)::int AS n FROM cell_towers GROUP BY mcc ORDER BY n DESC LIMIT 10`),
    ]);
    return { total: Number(tot.rows[0].n), parPays: pays.rows };
  } catch {
    // Table pas encore créée (migration non lancée).
    return { total: 0, parPays: [] };
  }
}

/** Distance Haversine en mètres. */
function distanceM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Poids d'une antenne : signal fort (dBm proche de 0) = plus proche = poids plus élevé ; sinon 1/portée. */
function poids(signal: number | undefined, range_m: number): number {
  if (signal != null && signal < 0) return 1 / Math.max(1, 120 + signal); // -50 dBm => fort, -110 => faible
  return 1 / Math.max(50, range_m || 1000);
}

/**
 * Résout la position à partir des antennes serveuses, via NOTRE base.
 * Plusieurs antennes trouvées => triangulation par barycentre pondéré.
 */
export async function resoudrePosition(
  _radio: string,
  mcc: number,
  mnc: number,
  cells: Cellule[]
): Promise<ResultatGeoloc> {
  const trouvees: { lat: number; lon: number; range_m: number; signal?: number }[] = [];
  for (const c of cells) {
    const r = await pool.query(
      `SELECT lat, lon, range_m FROM cell_towers WHERE mcc = $1 AND mnc = $2 AND lac = $3 AND cid = $4 LIMIT 1`,
      [mcc, mnc, c.lac, c.cid]
    );
    if (r.rows[0]) {
      trouvees.push({
        lat: Number(r.rows[0].lat),
        lon: Number(r.rows[0].lon),
        range_m: Number(r.rows[0].range_m) || 1000,
        signal: c.signal,
      });
    }
  }

  if (!trouvees.length) {
    return {
      statut: "echoue",
      latitude: null,
      longitude: null,
      precision_m: null,
      source: null,
      cellules_resolues: 0,
      cellules_totales: cells.length,
      erreur: `Aucune de ces antennes n'est dans notre base (MCC ${mcc}, MNC ${mnc}). Chargez les données OpenCelliD de cette zone.`,
    };
  }

  // Barycentre pondéré = notre triangulation.
  let sw = 0;
  let slat = 0;
  let slon = 0;
  for (const t of trouvees) {
    const w = poids(t.signal, t.range_m);
    sw += w;
    slat += w * t.lat;
    slon += w * t.lon;
  }
  const lat = slat / sw;
  const lon = slon / sw;

  // Précision estimée : 1 antenne => sa portée ; plusieurs => dispersion autour du barycentre.
  let precision: number;
  if (trouvees.length === 1) {
    precision = Math.round(trouvees[0].range_m);
  } else {
    const dmax = Math.max(...trouvees.map((t) => distanceM(lat, lon, t.lat, t.lon)));
    precision = Math.max(50, Math.round(dmax));
  }

  return {
    statut: "ok",
    latitude: Number(lat.toFixed(6)),
    longitude: Number(lon.toFixed(6)),
    precision_m: precision,
    source: trouvees.length > 1 ? "triangulation multi-cellules (base propre)" : "cellule serveuse (base propre)",
    cellules_resolues: trouvees.length,
    cellules_totales: cells.length,
    erreur: null,
  };
}
