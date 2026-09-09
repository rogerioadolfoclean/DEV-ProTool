"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { pool } from "@/lib/db";
import { audit, exigerEcriture } from "@/lib/auth";
import { sonderFlux } from "@/lib/radio-probe";

// Construit une URL d'ecoute par defaut selon le PROTOCOLE (Icecast / Shoutcast / HLS).
function urlEcoute(fournie: string, serveur: string, port: string, mount: string, protocole: string): string {
  if (fournie) return fournie.trim();
  if (!serveur) return "";
  const host = serveur.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const proto = (protocole || "Icecast").toLowerCase();
  const m = mount.replace(/^\//, "").replace(/\/source$/, "");

  if (proto === "shoutcast") {
    // Shoutcast : http, port souvent 8000 ; mount = Stream ID (v2) ou vide (v1).
    const p = port ? `:${port}` : ":8000";
    const chemin = m ? (/^\d+$/.test(m) ? `/stream/${m}` : `/${m}`) : "/;";
    return `http://${host}${p}${chemin}`;
  }
  // Icecast / HLS : https, mount tel quel.
  const p = port && port !== "80" && port !== "443" ? `:${port}` : "";
  const chemin = m ? `/${m}` : "";
  return `https://${host}${p}${chemin}`;
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
  const url = urlEcoute(d.url, d.serveur, d.port, d.mount, d.protocole);
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
  const url = urlEcoute(d.url, d.serveur, d.port, d.mount, d.protocole);
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

// Sonde RÉELLE du serveur de diffusion → met à jour état en ligne + auditeurs réels.
async function appliquerSonde(id: number, tenantId: number) {
  const q = await pool.query(
    `SELECT serveur,port,mount_point,protocole,url_flux,auditeurs_pic FROM flux_streaming WHERE id=$1 AND tenant_id=$2`,
    [id, tenantId],
  );
  if (!q.rowCount) return;
  const f = q.rows[0] as { serveur: string | null; port: number | null; mount_point: string | null; protocole: string; url_flux: string | null; auditeurs_pic: number };
  const r = await sonderFlux(f);
  const statut = r.online ? "en_ligne" : "hors_ligne";
  const titre = r.titre?.trim() || null;
  if (r.listeners !== null) {
    // Chiffre réel obtenu : on l'écrit et on relève le pic si dépassé.
    const pic = Math.max(f.auditeurs_pic ?? 0, r.listeners);
    await pool.query(
      `UPDATE flux_streaming SET statut=$1,auditeurs_actuels=$2,auditeurs_pic=$3,titre_en_cours=$4,derniere_verif=NOW() WHERE id=$5 AND tenant_id=$6`,
      [statut, r.listeners, pic, titre, id, tenantId],
    );
  } else {
    // Nombre d'auditeurs non exposé (Zeno/HLS) : on ne met à jour QUE l'état + le titre réel, jamais un chiffre inventé.
    await pool.query(
      `UPDATE flux_streaming SET statut=$1,titre_en_cours=$2,derniere_verif=NOW() WHERE id=$3 AND tenant_id=$4`,
      [statut, titre, id, tenantId],
    );
  }
  return r;
}

export async function rafraichirFlux(fd: FormData) {
  const s = await exigerEcriture();
  const id = Number(fd.get("id"));
  if (!id) throw new Error("Flux invalide");
  const r = await appliquerSonde(id, s.tenantId);
  await audit("verification_flux_radio", String(id), r ? `${r.online ? "en ligne" : "hors ligne"}${r.listeners !== null ? ` · ${r.listeners} auditeurs` : ""} (${r.source})` : null);
  revalidatePath("/console/radio-web");
}

export async function rafraichirTousFlux() {
  const s = await exigerEcriture();
  const q = await pool.query(`SELECT id FROM flux_streaming WHERE tenant_id=$1`, [s.tenantId]);
  await Promise.all(q.rows.map((row: { id: number }) => appliquerSonde(row.id, s.tenantId)));
  await audit("verification_flux_radio", "*", `${q.rowCount} flux sondés`);
  revalidatePath("/console/radio-web");
}
