// OmniComm 360° — Applique TOUTES les migrations idempotentes en une commande :
//   node scripts/migrate-all.js
// Sûr à relancer sur une base existante (chaque migration = CREATE TABLE IF NOT EXISTS
// / ADD COLUMN IF NOT EXISTS). Évite le piège « colonne ajoutée à la main sans
// migration » qui avait cassé RF-010 (Radio Web).
//
// ⚠️ Ceci n'exécute PAS setup-db.js : ce dernier ré-insère les données de démo et ne
// doit être lancé QUE sur une base vierge (première installation).
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Charge .env dans process.env pour que les migrations (qui lisent
// process.env.DATABASE_URL) fonctionnent, y compris lancées via ce runner.
for (const f of [".env.local", ".env"]) {
  const p = path.join(__dirname, "..", f);
  if (!fs.existsSync(p)) continue;
  for (const l of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const i = l.indexOf("=");
    if (i > 0 && !l.startsWith("#") && !process.env[l.slice(0, i)]) {
      process.env[l.slice(0, i)] = l.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    }
  }
}

// Ordre = dépendances (les tables référencent tenants, déjà présent en base).
const MIGRATIONS = [
  "migration-calls.js",
  "migration-clients-crm.js",
  "migration-listes-appels.js",
  "migration-file-appels.js",
  "migration-rendez-vous.js",
  "migration-campagnes.js",
  "migration-message-attachments.js",
  "migration-operator-delivery.js",
  "migration-statut-simule.js",
  "migration-radio-streaming.js",
];

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL introuvable (.env). Migrations annulées.");
  process.exit(1);
}

for (const f of MIGRATIONS) {
  const p = path.join(__dirname, f);
  if (!fs.existsSync(p)) {
    console.log(`⏭  ${f} (absent, ignoré)`);
    continue;
  }
  process.stdout.write(`\n▶ ${f}\n`);
  try {
    execFileSync(process.execPath, [p], { stdio: "inherit", env: process.env });
  } catch {
    console.error(`\n❌ Échec sur ${f} — on arrête ici.`);
    process.exit(1);
  }
}
console.log("\n✅ Toutes les migrations OmniComm 360° sont appliquées.");
