"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { pool } from "@/lib/db";
import { audit, exigerEcriture } from "@/lib/auth";

// Construit une URL d'ecoute par defaut a partir du serveur + mount si non fournie.
function urlEcoute(fournie: string, serveur: string, port: string, mount: string): string {
  if (fournie) return fournie.trim();
  if (!serveur) return "";
  const host = serveur.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const p = port && port !== "80" ? `:${port}` : "";
  const m = mount ? `/${mount.replace(/^\//, "").replace(/\/source$/, "")}` : "";
  return `https://${host}${p}${m}`;
}

function lire(fd: FormData) {
  return {
    nom: String(fd.get("nom") || "").trim(),
    type: String(fd.get("type") || "radio"),
    protocole: String(fd.get("protocole") || "Icecast"),
    bitrate: Number(fd.get("bitrate_kbps") || 128),
    encodage: String(fd.get("encodage") || "MP3"),
    serveur: String(fd.get("serveur") || "").trim(),
    port: String(fd.get("port") || "").trim(),
    mount: String(fd.get("mount_point") || "").trim(),
    username: String(fd.get("username") || "").trim(),
    motpasse: String(fd.get("mot_passe") || "").trim(),
    url: String(fd.get("url_flux") || "").trim(),
    statut: String(fd.get("statut") || "en_ligne"),
  };
}

export async function creerFlux(fd: FormData) {
  const s = await exigerEcriture();
  const d = lire(fd);
  if (!d.nom) throw new Error("Nom du flux obligatoire");
  const url = urlEcoute(d.url, d.serveur, d.port, d.mount);
  const r = await pool.query(
    `INSERT INTO flux_streaming (tenant_id,nom,type,protocole,url_flux,bitrate_kbps,auditeurs_actuels,auditeurs_pic,statut,serveur,port,mount_point,username,mot_passe,encodage)
     VALUES ($1,$2,$3,$4,$5,$6,0,0,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
    [s.tenantId, d.nom, d.type, d.protocole, url, d.bitrate, d.statut, d.serveur || null, d.port ? Number(d.port) : null, d.mount || null, d.username || null, d.motpasse || null, d.encodage],
  );
  await audit("creation_flux_radio", String(r.rows[0].id), `${d.nom} (${d.protocole})`);
  revalidatePath("/console/radio-web");
}

export async function modifierFlux(fd: FormData) {
  const s = await exigerEcriture();
  const id = Number(fd.get("id"));
  const d = lire(fd);
  if (!id || !d.nom) throw new Error("Paramètres invalides");
  const url = urlEcoute(d.url, d.serveur, d.port, d.mount);
  const r = await pool.query(
    `UPDATE flux_streaming SET nom=$1,type=$2,protocole=$3,url_flux=$4,bitrate_kbps=$5,statut=$6,serveur=$7,port=$8,mount_point=$9,username=$10,mot_passe=$11,encodage=$12
     WHERE id=$13 AND tenant_id=$14 RETURNING id`,
    [d.nom, d.type, d.protocole, url, d.bitrate, d.statut, d.serveur || null, d.port ? Number(d.port) : null, d.mount || null, d.username || null, d.motpasse || null, d.encodage, id, s.tenantId],
  );
  if (!r.rowCount) throw new Error("Flux introuvable");
  await audit("modification_flux_radio", String(id), d.nom);
  revalidatePath("/console/radio-web");
  redirect("/console/radio-web");
}

export async function supprimerFlux(fd: FormData) {
  const s = await exigerEcriture();
  const id = Number(fd.get("id"));
  await pool.query(`DELETE FROM flux_streaming WHERE id=$1 AND tenant_id=$2`, [id, s.tenantId]);
  await audit("suppression_flux_radio", String(id), null);
  revalidatePath("/console/radio-web");
}
