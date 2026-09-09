import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { routeApi, erreurJson, type ContexteApi } from "@/lib/api-auth";
import { diagnostiquerSim, resumeDiagnostic } from "@/lib/sim-diagnostic";

export const dynamic = "force-dynamic";

/** GET /api/v1/sims — parc SIM M2M/IoT du tenant. */
export const GET = routeApi(async (req: NextRequest, ctx: ContexteApi) => {
  const url = new URL(req.url);
  const statut = url.searchParams.get("statut");
  const r = await pool.query(
    `SELECT id, iccid, msisdn, imsi, statut, apn, secteur, data_mois_mo, etiquette, derniere_activite
     FROM sims WHERE tenant_id = $1 AND ($2::text IS NULL OR statut = $2) ORDER BY id LIMIT 100`,
    [ctx.tenantId, statut]
  );
  return NextResponse.json({ donnees: r.rows, total: r.rows.length });
});

/** PATCH /api/v1/sims — cycle de vie : {"id": 3, "action": "suspendre"|"activer"|"diagnostiquer"}. */
export const PATCH = routeApi(async (req: NextRequest, ctx: ContexteApi) => {
  let corps: { id?: number; action?: string };
  try {
    corps = await req.json();
  } catch {
    return erreurJson(400, "json_invalide", "Le corps de la requête doit être du JSON valide.");
  }
  const { id, action } = corps;
  if (!id || !action) return erreurJson(422, "parametres_manquants", "Les champs 'id' et 'action' sont obligatoires.");

  const sim = await pool.query(`SELECT id, statut, secteur, data_mois_mo, derniere_activite, apn FROM sims WHERE id = $1 AND tenant_id = $2`, [id, ctx.tenantId]);
  if (!sim.rows[0]) return erreurJson(404, "sim_introuvable", `Aucune SIM #${id} pour ce tenant.`);

  if (action === "diagnostiquer") {
    const d = diagnostiquerSim(sim.rows[0]);
    await pool.query(`INSERT INTO sim_evenements (sim_id, type, details) VALUES ($1,'diagnostic',$2)`, [id, resumeDiagnostic(d)]);
    return NextResponse.json({ donnees: { id, diagnostic: d } });
  }
  const statut = action === "activer" ? "active" : action === "suspendre" ? "suspendue" : null;
  if (!statut) return erreurJson(422, "action_invalide", "Actions : activer, suspendre, diagnostiquer.");
  await pool.query(`UPDATE sims SET statut = $1, derniere_activite = NOW() WHERE id = $2`, [statut, id]);
  await pool.query(`INSERT INTO sim_evenements (sim_id, type, details) VALUES ($1,$2,'Via API v1')`, [
    id, statut === "active" ? "reactivation" : "suspension",
  ]);
  return NextResponse.json({ donnees: { id, statut } });
});
