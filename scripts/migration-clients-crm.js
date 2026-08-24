// Cree la table CRM `clients` (manquante) utilisee par /clients, /api/clients,
// /api/dashboard et les routes /api/voice/*. Idempotent + seed leger.
const { Pool } = require("pg");
const fs = require("fs");
let url = process.env.DATABASE_URL;
if (!url && fs.existsSync(".env")) { const m = fs.readFileSync(".env", "utf8").match(/DATABASE_URL="?([^"\n]+)"?/); url = m && m[1]; }
const pool = new Pool({ connectionString: url });

(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS clients (
      id SERIAL PRIMARY KEY,
      external_id VARCHAR(40) UNIQUE NOT NULL,
      name VARCHAR(180) NOT NULL,
      phone VARCHAR(40) NOT NULL,
      email VARCHAR(180),
      city VARCHAR(120),
      country VARCHAR(80) DEFAULT 'RDC',
      status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','blocked')),
      last_contact_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
    CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
  `);

  // Seed leger et coherent avec les noms deja presents dans les demos de la console.
  const seed = [
    ["CLI-000001", "Marie-Louise Kabila", "+243817007888", "marie.kabila@agritech-kivu.cd", "Goma", "RDC", "active"],
    ["CLI-000002", "Paul Tshibangu", "+243813734492", "paul.tshibangu@katangatel.cd", "Lubumbashi", "RDC", "active"],
    ["CLI-000003", "Sophie Lumbu", "+243990112233", "sophie.lumbu@omnicomm360.cd", "Kinshasa", "RDC", "active"],
    ["CLI-000004", "Alain Banza", "+243817000001", "alain.banza@client.cd", "Kolwezi", "RDC", "inactive"],
    ["CLI-000005", "Jean Mukendi", "+243812223344", "jean.mukendi@client.cd", "Mbuji-Mayi", "RDC", "active"],
    ["CLI-000006", "Ana Fernandes", "+244923556677", "ana.fernandes@cliente.ao", "Luanda", "Angola", "active"],
  ];
  for (const [ext, name, phone, email, city, country, status] of seed) {
    await pool.query(
      `INSERT INTO clients (external_id,name,phone,email,city,country,status,last_contact_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7, NOW() - (random()*INTERVAL '20 days'))
       ON CONFLICT (external_id) DO NOTHING`,
      [ext, name, phone, email, city, country, status],
    );
  }

  const { rows } = await pool.query("SELECT COUNT(*)::int AS n FROM clients");
  console.log(`Migration clients-crm OK — table creee, ${rows[0].n} clients en base.`);
})().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => pool.end());
