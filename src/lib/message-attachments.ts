import { pool } from "@/lib/db";

let ready: Promise<void> | null = null;

/** Idempotent initialization so production works even when the migration runner was not executed. */
export function ensureMessageAttachmentsTable() {
  if (!ready) {
    ready = pool.query(`
      CREATE TABLE IF NOT EXISTS message_attachments (
        id SERIAL PRIMARY KEY,
        message_id INT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
        nom_fichier VARCHAR(255) NOT NULL,
        mime_type VARCHAR(120) NOT NULL,
        taille_octets INT NOT NULL CHECK (taille_octets > 0 AND taille_octets <= 4194304),
        contenu BYTEA NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_message_attachments_message
        ON message_attachments(message_id, created_at DESC);
    `).then(() => undefined).catch((error) => {
      ready = null;
      throw error;
    });
  }
  return ready;
}
