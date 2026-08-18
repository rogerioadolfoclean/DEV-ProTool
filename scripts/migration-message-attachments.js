// Migration OmniComm 360° — pièces jointes des messages.
// Stockage sécurisé en PostgreSQL : images, PDF et documents Word.
// Usage : node scripts/migration-message-attachments.js
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const env = fs.readFileSync(path.join(__dirname, "..", ".env"), "utf8");
const match = env.match(/DATABASE_URL="([^"]+)"/);
if (!match) throw new Error("DATABASE_URL introuvable dans .env");

const SQL = `
CREATE TABLE IF NOT EXISTS message_attachments (
  id SERIAL PRIMARY KEY,
  message_id INT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  nom_fichier VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  taille_octets INT NOT NULL CHECK (taille_octets > 0 AND taille_octets <= 4194304),
  contenu BYTEA NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_message_attachments_message ON message_attachments(message_id, created_at DESC);
`;

(async () => {
  const pool = new Pool({ connectionString: match[1], max: 2 });
  await pool.query(SQL);
  await pool.end();
  console.log("Migration message_attachments appliquée.");
})().catch((e) => { console.error("ERREUR:", e.message); process.exit(1); });
