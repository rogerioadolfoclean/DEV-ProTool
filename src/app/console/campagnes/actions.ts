"use server";

import { revalidatePath } from "next/cache";
import { pool } from "@/lib/db";
import { audit, exigerEcriture } from "@/lib/auth";

export async function creerCampagne(formData: FormData) {
  const session = await exigerEcriture();
  const nom = String(formData.get("nom") ?? "").trim();
  const canal = String(formData.get("canal") ?? "sms");
  const categorie = String(formData.get("categorie") ?? "marketing");
  const contenu = String(formData.get("contenu") ?? "").trim();
  const planifiee = String(formData.get("planifiee_at") ?? "").trim();
  if (!nom || !contenu) throw new Error("Nom et contenu obligatoires");
  const r = await pool.query(`INSERT INTO campagnes (tenant_id,nom,canal,categorie,contenu,planifiee_at,statut) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`, [session.tenantId, nom, canal, categorie, contenu, planifiee || null, planifiee ? "planifiee" : "brouillon"]);
  await audit("campagne_creee", String(r.rows[0].id), `Campagne ${nom} (${canal})`);
  revalidatePath("/console/campagnes");
}

export async function changerStatutCampagne(formData: FormData) {
  const session = await exigerEcriture();
  const id = Number(formData.get("id"));
  const statut = String(formData.get("statut"));
  const allowed = ["brouillon","planifiee","en_cours","terminee","annulee"];
  if (!Number.isInteger(id) || !allowed.includes(statut)) throw new Error("Paramètres invalides");
  const r = await pool.query(`UPDATE campagnes SET statut=$1, updated_at=NOW() WHERE id=$2 AND tenant_id=$3 RETURNING id`, [statut,id,session.tenantId]);
  if (!r.rowCount) throw new Error("Campagne introuvable");
  await audit("campagne_statut", String(id), `Nouveau statut: ${statut}`);
  revalidatePath("/console/campagnes");
}
