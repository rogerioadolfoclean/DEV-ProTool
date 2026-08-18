"use server";

import { revalidatePath } from "next/cache";
import { pool } from "./db";
import { exigerEcriture, audit } from "./auth";
import { envoyerMessage } from "./actions";

const MAX_FILES = 5;
const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function isAllowed(file: File) {
  return file.type.startsWith("image/") || ALLOWED.has(file.type);
}

/** Envoi omnicanal avec pièces jointes persistées dans PostgreSQL. */
export async function envoyerMessageAvecPiecesJointes(formData: FormData) {
  const session = await exigerEcriture();
  const files = formData.getAll("piecesJointes").filter((value): value is File => value instanceof File && value.size > 0);

  if (files.length > MAX_FILES) throw new Error(`Maximum ${MAX_FILES} pièces jointes.`);
  for (const file of files) {
    if (!isAllowed(file)) throw new Error(`Type de fichier non autorisé : ${file.name}`);
    if (file.size > MAX_BYTES) throw new Error(`Fichier trop volumineux : ${file.name} (maximum 4 Mo).`);
  }

  // Le moteur d'envoi existant reste responsable du routage, DND, passerelle et CDR.
  await envoyerMessage(formData);
  if (!files.length) return;

  const canal = String(formData.get("canal") ?? "sms");
  const de = String(formData.get("de") ?? "OmniComm");
  const vers = String(formData.get("vers") ?? "").trim();
  const contenu = String(formData.get("contenu") ?? "").trim();

  // On retrouve le message créé par cette requête et on vérifie le tenant.
  const message = await pool.query(
    `SELECT id FROM messages
     WHERE tenant_id = $1 AND canal = $2 AND de = $3 AND vers = $4 AND contenu = $5
     ORDER BY created_at DESC LIMIT 1`,
    [session.tenantId, canal, de, vers, contenu]
  );
  if (!message.rows[0]) throw new Error("Message créé mais introuvable pour ses pièces jointes.");

  for (const file of files) {
    const bytes = Buffer.from(await file.arrayBuffer());
    await pool.query(
      `INSERT INTO message_attachments (message_id, nom_fichier, mime_type, taille_octets, contenu)
       VALUES ($1,$2,$3,$4,$5)`,
      [message.rows[0].id, file.name.slice(0, 255), file.type || "application/octet-stream", bytes.length, bytes]
    );
  }

  await audit("pieces_jointes_message", String(message.rows[0].id), `${files.length} fichier(s)`);
  revalidatePath("/console");
}
