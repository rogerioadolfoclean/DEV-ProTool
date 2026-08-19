const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS campagnes (
      id SERIAL PRIMARY KEY,
      tenant_id INT NOT NULL REFERENCES tenants(id),
      nom VARCHAR(160) NOT NULL,
      canal VARCHAR(20) NOT NULL CHECK (canal IN ('sms','whatsapp','email','voix','multicanal')),
      categorie VARCHAR(20) NOT NULL DEFAULT 'marketing' CHECK (categorie IN ('transactionnel','marketing')),
      statut VARCHAR(20) NOT NULL DEFAULT 'brouillon' CHECK (statut IN ('brouillon','planifiee','en_cours','terminee','annulee')),
      contenu TEXT NOT NULL DEFAULT '',
      cible_filtre JSONB NOT NULL DEFAULT '{}',
      planifiee_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_campagnes_tenant_date ON campagnes(tenant_id, created_at DESC);
  `);
  console.log('Migration campagnes OK');
})().catch((err) => { console.error(err); process.exitCode = 1; }).finally(() => pool.end());
