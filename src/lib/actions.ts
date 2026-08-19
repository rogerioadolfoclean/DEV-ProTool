"use server";

import { revalidatePath } from "next/cache";
import crypto from "crypto";
import { pool } from "./db";
import { exigerEcriture, exigerAdmin, audit } from "./auth";
import { envoyerViaPasserelle, appelerViaPasserelle } from "./gateway";
import { envoyerEmail } from "./email-gateway";

/** Routage Least-Cost (RF-001) : choisit l'opérateur le moins cher pour le préfixe. */
async function routerLeastCost(canal: string, vers: string) {
  const r = await pool.query(
    `SELECT operateur, cout_par_unite, pays FROM routes_tarifs
     WHERE canal = $1 AND actif = TRUE AND $2 LIKE prefixe || '%'
     ORDER BY cout_par_unite ASC, priorite ASC LIMIT 1`,
    [canal === "rcs" ? "sms" : canal, vers]
  );
  return r.rows[0] ?? null;
}

/** Vérification DND (RF-006) : bloque si le destinataire est en opt-out. */
async function estOptOut(tenantId: number, canal: string, identifiant: string) {
  const r = await pool.query(`SELECT 1 FROM optouts WHERE tenant_id = $1 AND canal = $2 AND identifiant = $3`, [tenantId, canal === "rcs" ? "sms" : canal, identifiant]);
  return r.rows.length > 0;
}

/** Envoi d'un message omnicanal (RF-001..005). */
export async function envoyerMessage(formData: FormData) {
  const s = await exigerEcriture();
  const canal = String(formData.get("canal") ?? "sms");
  const de = String(formData.get("de") ?? "OmniComm");
  const vers = String(formData.get("vers") ?? "").trim();
  const contenu = String(formData.get("contenu") ?? "").trim();
  const sujet = String(formData.get("sujet") ?? "") || null;
  const categorie = String(formData.get("categorie") ?? "transactionnel");
  if (!vers || !contenu) return;

  if (categorie === "marketing" && (await estOptOut(s.tenantId, canal, vers))) {
    await pool.query(`INSERT INTO messages (tenant_id, canal, de, vers, sujet, contenu, statut, categorie, erreur) VALUES ($1,$2,$3,$4,$5,$6,'rejete_dnd',$7,'Destinataire inscrit sur liste DND (opt-out)')`, [s.tenantId, canal, de, vers, sujet, contenu, categorie]);
    revalidatePath("/console");
    return;
  }

  const route = await routerLeastCost(canal, vers);
  const passerelle = canal === "email"
    ? await envoyerEmail(de, vers, sujet ?? "OmniComm 360", contenu)
    : await envoyerViaPasserelle(canal, vers, contenu);
  const reel = passerelle.mode === "reel";
  const statut = reel ? passerelle.statut : "simule";
  const operateur = reel
    ? (canal === "email" ? "Resend" : canal === "whatsapp" ? "Meta WhatsApp" : `Twilio → ${route?.operateur ?? "international"}`)
    : route?.operateur ?? (canal === "email" ? "E-mail API" : canal === "push" ? "FCM" : canal === "fax" ? "FoIP Gateway" : "Route par défaut");

  await pool.query(
    `INSERT INTO messages (tenant_id, canal, de, vers, sujet, contenu, statut, categorie, operateur_route, pays_destination, cout, erreur, mode_envoi, fournisseur_id, delivered_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
    [s.tenantId, canal, de, vers, sujet, contenu, statut, categorie, operateur, route?.pays ?? null, route?.cout_par_unite ?? 0.0002,
      reel ? passerelle.erreur : passerelle.raison, reel ? "reel" : "demo", reel ? passerelle.fournisseurId : null, null]
  );
  await pool.query(`INSERT INTO cdrs (tenant_id, type, source, destination, duree_secondes, cout, operateur, pays_destination) VALUES ($1,$2,$3,$4,0,$5,$6,$7)`, [s.tenantId, canal === "email" ? "email" : canal === "fax" ? "fax" : "sms", de, vers, route?.cout_par_unite ?? 0.0002, route?.operateur ?? null, route?.pays ?? null]);
  await audit("envoi_message", vers, `Canal ${canal} (${categorie})`);
  revalidatePath("/console");
}

/** Ajout / retrait de la liste DND (RF-006). */
export async function ajouterOptOut(formData: FormData) {
  const s = await exigerEcriture();
  const canal = String(formData.get("canal") ?? "sms");
  const identifiant = String(formData.get("identifiant") ?? "").trim();
  if (!identifiant) return;
  await pool.query(`INSERT INTO optouts (tenant_id, canal, identifiant, source) VALUES ($1,$2,$3,'ajout manuel console') ON CONFLICT (tenant_id, canal, identifiant) DO NOTHING`, [s.tenantId, canal, identifiant]);
  await audit("optout_ajout", identifiant, `Canal ${canal}`);
  revalidatePath("/console/conformite-dnd");
}
export async function retirerOptOut(formData: FormData) {
  await exigerEcriture();
  const id = Number(formData.get("id"));
  await pool.query(`DELETE FROM optouts WHERE id = $1`, [id]);
  await audit("optout_retrait", String(id), null);
  revalidatePath("/console/conformite-dnd");
}

/** Lancement d'un appel sortant (RF-007) — réel via Twilio si configuré, sinon simulé. */
export async function lancerAppel(formData: FormData) {
  const s = await exigerEcriture();
  const de = String(formData.get("de") ?? "+243815550000");
  const vers = String(formData.get("vers") ?? "").trim();
  const type = String(formData.get("type") ?? "standard");
  const message = String(formData.get("message") ?? "") || "Bonjour, ceci est un appel de la plateforme OmniComm 360.";
  if (!vers) return;
  const route = await routerLeastCost("voix", vers);
  const passerelle = await appelerViaPasserelle(vers, message);
  const reel = passerelle.mode === "reel";
  const statut = reel ? (passerelle.statut === "envoye" ? "en_cours" : "echoue") : "simule";
  const duree = 0;
  const cout = 0;
  await pool.query(`INSERT INTO appels (tenant_id, direction, de, vers, statut, type, duree_secondes, mos_score, attestation_stir, cout, mode_envoi, fournisseur_id, erreur) VALUES ($1,'sortant',$2,$3,$4,$5,$6,NULL,'A',$7,$8,$9,$10)`, [s.tenantId, de, vers, statut, type, duree, cout, reel ? "reel" : "demo", reel ? passerelle.fournisseurId : null, reel ? passerelle.erreur : passerelle.raison]);
  if (reel && passerelle.statut === "envoye") await pool.query(`INSERT INTO cdrs (tenant_id, type, source, destination, duree_secondes, cout, operateur, pays_destination) VALUES ($1,'voix',$2,$3,$4,$5,$6,$7)`, [s.tenantId, de, vers, duree, cout, route?.operateur ?? null, route?.pays ?? null]);
  await audit("appel_sortant", vers, `Type ${type} — mode ${reel ? "réel" : "démonstration"}`);
  revalidatePath("/console/appels");
}

/** Cycle de vie SIM (RF-012). */
export async function changerStatutSim(formData: FormData) {
  await exigerEcriture(); const id = Number(formData.get("id")); const statut = String(formData.get("statut"));
  if (!["active", "suspendue", "inactive", "resiliee"].includes(statut)) return;
  await pool.query(`UPDATE sims SET statut = $1, derniere_activite = NOW() WHERE id = $2`, [statut, id]);
  const type = statut === "active" ? "reactivation" : statut === "suspendue" ? "suspension" : "diagnostic";
  await pool.query(`INSERT INTO sim_evenements (sim_id, type, details) VALUES ($1,$2,$3)`, [id, type, `Changement de statut → ${statut} (console)`]);
  await audit("sim_statut", String(id), statut); revalidatePath("/console/sims");
}
export async function diagnostiquerSim(formData: FormData) {
  await exigerEcriture(); const id = Number(formData.get("id")); const signal = -70 - Math.floor(Math.random() * 35); const latence = 80 + Math.floor(Math.random() * 400);
  await pool.query(`INSERT INTO sim_evenements (sim_id, type, details) VALUES ($1,'diagnostic',$2)`, [id, `Diagnostic : signal ${signal} dBm, latence ${latence} ms, ${signal > -95 ? "état OK" : "signal faible"}`]);
  await audit("sim_diagnostic", String(id), null); revalidatePath("/console/sims");
}

/** Attribution d'un numéro virtuel (RF-015). */
export async function attribuerNumero(formData: FormData) { const s=await exigerEcriture(); const id=Number(formData.get("id")); await pool.query(`UPDATE numeros_virtuels SET tenant_id=$1, statut='attribue' WHERE id=$2 AND statut='disponible'`,[s.tenantId,id]); await audit("numero_attribution",String(id),null); revalidatePath("/console/numeros"); }
export async function libererNumero(formData: FormData) { await exigerEcriture(); const id=Number(formData.get("id")); await pool.query(`UPDATE numeros_virtuels SET tenant_id=NULL, statut='disponible' WHERE id=$1`,[id]); await audit("numero_liberation",String(id),null); revalidatePath("/console/numeros"); }

/** Webhooks (RF-021). */
export async function creerWebhook(formData: FormData) { const s=await exigerEcriture(); const url=String(formData.get("url")??"").trim(); const evenements=String(formData.get("evenements")??"message.livre").split(",").map(e=>e.trim()).filter(Boolean); if(!url.startsWith("https://")) return; await pool.query(`INSERT INTO webhooks (tenant_id,url,evenements,secret) VALUES ($1,$2,$3,$4)`,[s.tenantId,url,evenements,"whsec_"+crypto.randomBytes(12).toString("hex")]); await audit("webhook_creation",url,evenements.join(",")); revalidatePath("/console/webhooks"); }
export async function basculerWebhook(formData: FormData) { await exigerEcriture(); const id=Number(formData.get("id")); await pool.query(`UPDATE webhooks SET actif=NOT actif WHERE id=$1`,[id]); revalidatePath("/console/webhooks"); }

/** Clés API (RF-016) — la clé en clair n'est montrée qu'une fois. */
export async function creerCleApi(formData: FormData): Promise<void> { const s=await exigerEcriture(); const nom=String(formData.get("nom")??"Nouvelle clé").trim(); const env=String(formData.get("environnement")??"sandbox"); const cle=(env==="production"?"omni_live_":"omni_test_")+crypto.randomBytes(18).toString("hex"); const hash=crypto.createHash("sha256").update(cle).digest("hex"); await pool.query(`INSERT INTO api_keys (tenant_id,nom,prefixe,cle_hash,environnement) VALUES ($1,$2,$3,$4,$5)`,[s.tenantId,nom,cle.slice(0,15),hash,env]); await audit("cle_api_creation",nom,env); const jar=await (await import("next/headers")).cookies(); jar.set("omni_nouvelle_cle",cle,{maxAge:60,path:"/console/developpeur"}); revalidatePath("/console/developpeur"); }
export async function revoquerCleApi(formData: FormData) { await exigerEcriture(); const id=Number(formData.get("id")); await pool.query(`UPDATE api_keys SET actif=FALSE WHERE id=$1`,[id]); await audit("cle_api_revocation",String(id),null); revalidatePath("/console/developpeur"); }

/** Traitement des alertes fraude (RF-019 / RF-024). */
export async function majAlerteFraude(formData: FormData) { await exigerEcriture(); const id=Number(formData.get("id")); const statut=String(formData.get("statut")); if(!["nouvelle","en_cours","resolue","faux_positif"].includes(statut)) return; await pool.query(`UPDATE alertes_fraude SET statut=$1 WHERE id=$2`,[statut,id]); await audit("alerte_fraude_maj",String(id),statut); revalidatePath("/console/anti-fraude"); revalidatePath("/console/revenue-assurance"); }

/** Gestion des tenants (RF-017) — admin plateforme uniquement. */
export async function basculerTenant(formData: FormData) { await exigerAdmin(); const id=Number(formData.get("id")); await pool.query(`UPDATE tenants SET actif=NOT actif WHERE id=$1`,[id]); await audit("tenant_bascule",String(id),null); revalidatePath("/console/tenants"); }

/** Changement de forfait (RF-020). */
export async function changerForfait(formData: FormData) {
  await exigerEcriture(); const abonnementId=Number(formData.get("abonnement_id")); const planId=Number(formData.get("plan_id"));
  const p=await pool.query(`SELECT type FROM plans_tarifaires WHERE id=$1`,[planId]); if(!p.rows[0]) return;
  await pool.query(`UPDATE abonnements SET plan_id=$1, mode=$2 WHERE id=$3`,[planId,p.rows[0].type,abonnementId]);
  await audit("changement_forfait",String(abonnementId),`Plan ${planId}`); revalidatePath("/console/mvno");
}
