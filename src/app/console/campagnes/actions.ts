"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { pool } from "@/lib/db";
import { audit, exigerEcriture } from "@/lib/auth";

const ensureCampagnes = async () => {
  await pool.query(`CREATE TABLE IF NOT EXISTS campagnes (id SERIAL PRIMARY KEY, tenant_id INT NOT NULL REFERENCES tenants(id), nom VARCHAR(160) NOT NULL, canal VARCHAR(20) NOT NULL CHECK (canal IN ('sms','whatsapp','email','voix','multicanal')), categorie VARCHAR(20) NOT NULL DEFAULT 'marketing' CHECK (categorie IN ('transactionnel','marketing')), statut VARCHAR(20) NOT NULL DEFAULT 'brouillon' CHECK (statut IN ('brouillon','planifiee','en_cours','terminee','annulee')), contenu TEXT NOT NULL DEFAULT '', cible_filtre JSONB NOT NULL DEFAULT '{}', planifiee_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()); CREATE INDEX IF NOT EXISTS idx_campagnes_tenant_date ON campagnes(tenant_id, created_at DESC);`);
};

export async function creerCampagne(formData: FormData) {
  const session = await exigerEcriture();
  await ensureCampagnes();
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

export async function modifierCampagne(formData: FormData) {
  const session = await exigerEcriture();
  await ensureCampagnes();
  const id = Number(formData.get("id"));
  const nom = String(formData.get("nom") ?? "").trim();
  const canal = String(formData.get("canal") ?? "sms");
  const categorie = String(formData.get("categorie") ?? "marketing");
  const contenu = String(formData.get("contenu") ?? "").trim();
  const planifiee = String(formData.get("planifiee_at") ?? "").trim();
  if (!Number.isInteger(id)) throw new Error("Identifiant invalide");
  if (!nom || !contenu) throw new Error("Nom et contenu obligatoires");
  const r = await pool.query(
    `UPDATE campagnes SET nom=$1, canal=$2, categorie=$3, contenu=$4, planifiee_at=$5, updated_at=NOW()
     WHERE id=$6 AND tenant_id=$7 RETURNING id`,
    [nom, canal, categorie, contenu, planifiee || null, id, session.tenantId],
  );
  if (!r.rowCount) throw new Error("Campagne introuvable");
  await audit("campagne_modifiee", String(id), `Campagne ${nom} (${canal}) mise à jour`);
  revalidatePath("/console/campagnes");
  redirect("/console/campagnes");
}

export async function changerStatutCampagne(formData: FormData) {
  const session = await exigerEcriture();
  await ensureCampagnes();
  const id = Number(formData.get("id"));
  const statut = String(formData.get("statut"));
  const allowed = ["brouillon","planifiee","en_cours","terminee","annulee"];
  if (!Number.isInteger(id) || !allowed.includes(statut)) throw new Error("Paramètres invalides");
  const r = await pool.query(`UPDATE campagnes SET statut=$1, updated_at=NOW() WHERE id=$2 AND tenant_id=$3 RETURNING id`, [statut,id,session.tenantId]);
  if (!r.rowCount) throw new Error("Campagne introuvable");
  await audit("campagne_statut", String(id), `Nouveau statut: ${statut}`);
  revalidatePath("/console/campagnes");
}
