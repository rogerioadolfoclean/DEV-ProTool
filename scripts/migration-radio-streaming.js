// RF-010 — Migration flux_streaming : colonnes de diffusion + protocole Shoutcast + horodatage de vérification.
// Idempotente : peut être relancée sans risque. Ne supprime aucune donnée.
const { Pool } = require("pg");

// Charge .env si présent (les scripts sont lancés hors Next).
try {
  const fs = require("fs");
  for (const f of [".env.local", ".env"]) {
    if (!fs.existsSync(f)) continue;
    for (const l of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
      const i = l.indexOf("=");
      if (i > 0 && !l.startsWith("#") && !process.env[l.slice(0, i)]) process.env[l.slice(0, i)] = l.slice(i + 1).replace(/^["']|["']$/g, "");
    }
  }
} catch {}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  // 1) Colonnes de configuration de diffusion (au cas où le schéma d'origine ne les a pas).
  await pool.query(`
    ALTER TABLE flux_streaming ADD COLUMN IF NOT EXISTS serveur      VARCHAR(160);
    ALTER TABLE flux_streaming ADD COLUMN IF NOT EXISTS port         INT;
    ALTER TABLE flux_streaming ADD COLUMN IF NOT EXISTS mount_point  VARCHAR(160);
    ALTER TABLE flux_streaming ADD COLUMN IF NOT EXISTS username     VARCHAR(80);
    ALTER TABLE flux_streaming ADD COLUMN IF NOT EXISTS mot_passe    VARCHAR(120);
    ALTER TABLE flux_streaming ADD COLUMN IF NOT EXISTS encodage     VARCHAR(10) DEFAULT 'MP3';
    ALTER TABLE flux_streaming ADD COLUMN IF NOT EXISTS derniere_verif TIMESTAMPTZ;
    ALTER TABLE flux_streaming ADD COLUMN IF NOT EXISTS titre_en_cours VARCHAR(200);
  `);

  // 2) Élargit la contrainte protocole pour inclure Shoutcast (bug : l'UI le propose, la DB le refusait).
  await pool.query(`ALTER TABLE flux_streaming DROP CONSTRAINT IF EXISTS flux_streaming_protocole_check`);
  await pool.query(`ALTER TABLE flux_streaming ADD CONSTRAINT flux_streaming_protocole_check CHECK (protocole IN ('HLS','Icecast','Shoutcast','RTMP'))`);

  const cols = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name='flux_streaming' ORDER BY ordinal_position`
  );
  console.log("Migration radio-streaming OK — colonnes :", cols.rows.map((r) => r.column_name).join(", "));
})()
  .catch((e) => {
    console.error("Migration radio-streaming ÉCHEC :", e.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
