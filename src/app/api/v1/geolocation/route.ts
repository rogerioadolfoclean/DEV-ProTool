import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { routeApi, erreurJson, type ContexteApi } from "@/lib/api-auth";
import { resoudrePosition, geolocationConfiguree, type Cellule } from "@/lib/geolocation";

export const dynamic = "force-dynamic";

/** GET /api/v1/geolocation — dernières positions RÉELLES du parc SIM du tenant (RF-013). */
export const GET = routeApi(async (req: NextRequest, ctx: ContexteApi) => {
  const url = new URL(req.url);
  const simId = url.searchParams.get("sim_id");
  const r = await pool.query(
    `SELECT g.id, g.sim_id, g.latitude, g.longitude, g.precision_m, g.methode, g.cellules, g.created_at,
            s.etiquette, s.msisdn, s.secteur
     FROM geolocalisations g
     JOIN sims s ON s.id = g.sim_id
     WHERE s.tenant_id = $1 AND ($2::int IS NULL OR g.sim_id = $2)
     ORDER BY g.created_at DESC LIMIT 100`,
    [ctx.tenantId, simId]
  );
  return NextResponse.json({
    fournisseur_configure: geolocationConfiguree(),
    donnees: r.rows,
    total: r.rows.length,
  });
});

/**
 * POST /api/v1/geolocation — localise un équipement à partir des antennes qui le voient.
 * Corps : { "sim_id": 3, "radio": "gsm", "mcc": 630, "mnc": 1,
 *           "cells": [{"lac": 12345, "cid": 67890, "signal": -75}, ...] }
 * Résolution RÉELLE via base d'antennes ; multi-cellules = triangulation.
 */
export const POST = routeApi(async (req: NextRequest, ctx: ContexteApi) => {
  let corps: { sim_id?: number; radio?: string; mcc?: number; mnc?: number; cells?: Cellule[] };
  try {
    corps = await req.json();
  } catch {
    return erreurJson(400, "json_invalide", "Le corps de la requête doit être du JSON valide.");
  }
  const { sim_id, radio, mcc, mnc, cells } = corps;
  if (!sim_id || mcc == null || mnc == null || !Array.isArray(cells) || cells.length === 0) {
    return erreurJson(422, "parametres_manquants", "Champs requis : 'sim_id', 'mcc', 'mnc' et 'cells' (liste non vide de {lac, cid}).");
  }
  for (const c of cells) {
    if (c == null || c.lac == null || c.cid == null) {
      return erreurJson(422, "cellule_invalide", "Chaque cellule doit contenir 'lac' et 'cid'.");
    }
  }

  // La SIM doit appartenir au tenant (isolation multi-tenant).
  const sim = await pool.query(`SELECT id FROM sims WHERE id = $1 AND tenant_id = $2`, [sim_id, ctx.tenantId]);
  if (!sim.rows[0]) return erreurJson(404, "sim_introuvable", `Aucune SIM #${sim_id} pour ce tenant.`);

  const r = await resoudrePosition(radio ?? "gsm", Number(mcc), Number(mnc), cells);

  // Aucun fournisseur configuré : on n'enregistre RIEN (pas de position inventée).
  if (r.mode === "demo") {
    return NextResponse.json({ mode: "demo", enregistre: false, avertissement: r.raison }, { status: 200 });
  }
  if (r.statut === "echoue") {
    return erreurJson(502, "resolution_echouee", r.erreur ?? "Résolution cellulaire échouée.");
  }

  // Position réelle : on l'enregistre (methode = 'cell-id' pour la distinguer du seed de démo).
  const ins = await pool.query(
    `INSERT INTO geolocalisations (sim_id, latitude, longitude, precision_m, methode, cellules)
     VALUES ($1,$2,$3,$4,'cell-id',$5)
     RETURNING id, latitude, longitude, precision_m, methode, created_at`,
    [sim_id, r.latitude, r.longitude, r.precision_m, JSON.stringify(cells)]
  );
  return NextResponse.json({ mode: "reel", source: r.source, donnees: ins.rows[0] }, { status: 201 });
});
