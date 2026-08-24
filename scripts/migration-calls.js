// Cree la table `calls` (journal des appels CRM/AutoDialer) utilisee par
// /api/voice/campaign, /api/voice/outbound, /api/clients/[id]. Idempotent.
const { Pool } = require("pg");
const fs = require("fs");
let url = process.env.DATABASE_URL;
if (!url && fs.existsSync(".env")) { const m = fs.readFileSync(".env", "utf8").match(/DATABASE_URL="?([^"\n]+)"?/); url = m && m[1]; }
const pool = new Pool({ connectionString: url });

(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS calls (
      id SERIAL PRIMARY KEY,
      client_id INT REFERENCES clients(id) ON DELETE SET NULL,
      campaign VARCHAR(180),
      status VARCHAR(30) NOT NULL DEFAULT 'initiated',
      direction VARCHAR(12) NOT NULL DEFAULT 'outbound',
      provider VARCHAR(40),
      provider_call_id VARCHAR(120),
      phone_number VARCHAR(40),
      city VARCHAR(120),
      country VARCHAR(80),
      duration_seconds INT DEFAULT 0,
      outcome VARCHAR(40),
      intent VARCHAR(60),
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_calls_client ON calls(client_id);
    CREATE INDEX IF NOT EXISTS idx_calls_started ON calls(started_at DESC);
  `);
  const { rows } = await pool.query("SELECT COUNT(*)::int AS n FROM calls");
  console.log(`Migration calls OK — table creee, ${rows[0].n} appels en base.`);
})().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => pool.end());
