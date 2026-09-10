// Crée la table `cell_towers` = NOTRE base d'antennes réelles (source : données ouvertes
// OpenCelliD), qui alimente NOTRE API de géolocalisation /api/v1/geolocation (RF-013).
// Aucune dépendance à un fournisseur tiers en temps réel : on héberge la donnée. Idempotent.
const { Pool } = require("pg");
const fs = require("fs");
let url = process.env.DATABASE_URL;
if (!url && fs.existsSync(".env")) { const m = fs.readFileSync(".env", "utf8").match(/DATABASE_URL="?([^"\n]+)"?/); url = m && m[1]; }
const pool = new Pool({ connectionString: url });

(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cell_towers (
      radio    VARCHAR(8),
      mcc      INT    NOT NULL,
      mnc      INT    NOT NULL,
      lac      INT    NOT NULL,
      cid      BIGINT NOT NULL,
      lon      NUMERIC(9,6) NOT NULL,
      lat      NUMERIC(9,6) NOT NULL,
      range_m  INT DEFAULT 1000,
      samples  INT DEFAULT 0,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (mcc, mnc, lac, cid)
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_cell_towers_lookup ON cell_towers (mcc, mnc, lac, cid);`);
  const n = await pool.query(`SELECT COUNT(*)::bigint AS n FROM cell_towers`);
  console.log(`OK — table cell_towers prête. Antennes chargées : ${n.rows[0].n}`);
  await pool.end();
})().catch((e) => { console.error(e); process.exit(1); });
