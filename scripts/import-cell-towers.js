// Importe des antennes RÉELLES dans NOTRE base `cell_towers` depuis un export OpenCelliD
// (données ouvertes, CC-BY-SA). Téléchargement UNIQUE et gratuit sur opencellid.org
// (fichier cell_towers.csv ou l'export par pays) → ensuite tout est à NOUS, zéro coût/appel.
//
// Usage :
//   node scripts/import-cell-towers.js <fichier.csv> [mcc1,mcc2,...]
// Exemple (RDC 630, Angola 631, Brésil 724) :
//   node scripts/import-cell-towers.js ./opencellid.csv 630,631,724
//
// Format OpenCelliD attendu (en-tête) :
//   radio,mcc,net,area,cell,unit,lon,lat,range,samples,changeable,created,updated,averageSignal
const { Pool } = require("pg");
const fs = require("fs");
const readline = require("readline");

let url = process.env.DATABASE_URL;
if (!url && fs.existsSync(".env")) { const m = fs.readFileSync(".env", "utf8").match(/DATABASE_URL="?([^"\n]+)"?/); url = m && m[1]; }
const pool = new Pool({ connectionString: url });

const fichier = process.argv[2];
const mccFiltre = (process.argv[3] || "630,631,724").split(",").map((s) => parseInt(s.trim(), 10)).filter(Boolean);

if (!fichier || !fs.existsSync(fichier)) {
  console.error("Fichier CSV OpenCelliD introuvable. Usage : node scripts/import-cell-towers.js <fichier.csv> [mcc,...]");
  process.exit(1);
}

async function flush(batch) {
  if (!batch.length) return;
  // upsert par lot
  const valeurs = [];
  const params = [];
  batch.forEach((r, i) => {
    const b = i * 9;
    valeurs.push(`($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7},$${b + 8},$${b + 9})`);
    params.push(r.radio, r.mcc, r.mnc, r.lac, r.cid, r.lon, r.lat, r.range_m, r.samples);
  });
  await pool.query(
    `INSERT INTO cell_towers (radio, mcc, mnc, lac, cid, lon, lat, range_m, samples)
     VALUES ${valeurs.join(",")}
     ON CONFLICT (mcc, mnc, lac, cid) DO UPDATE
       SET lon = EXCLUDED.lon, lat = EXCLUDED.lat, range_m = EXCLUDED.range_m,
           samples = EXCLUDED.samples, updated_at = NOW()`,
    params
  );
}

(async () => {
  console.log(`Import OpenCelliD → NOTRE base cell_towers. Pays (MCC) gardés : ${mccFiltre.join(", ")}`);
  const rl = readline.createInterface({ input: fs.createReadStream(fichier), crlfDelay: Infinity });
  let entete = true;
  let lus = 0, gardes = 0;
  let batch = [];
  for await (const ligne of rl) {
    if (entete) { entete = false; if (/radio|mcc/i.test(ligne)) continue; }
    const c = ligne.split(",");
    if (c.length < 9) continue;
    lus++;
    const mcc = parseInt(c[1], 10);
    if (mccFiltre.length && !mccFiltre.includes(mcc)) continue;
    const rec = {
      radio: (c[0] || "GSM").slice(0, 8),
      mcc,
      mnc: parseInt(c[2], 10),
      lac: parseInt(c[3], 10),
      cid: parseInt(c[4], 10),
      lon: parseFloat(c[6]),
      lat: parseFloat(c[7]),
      range_m: Math.max(1, parseInt(c[8], 10) || 1000),
      samples: parseInt(c[9], 10) || 0,
    };
    if (!Number.isFinite(rec.lat) || !Number.isFinite(rec.lon) || !rec.mnc || !rec.lac || !rec.cid) continue;
    batch.push(rec);
    gardes++;
    if (batch.length >= 500) { await flush(batch); batch = []; if (gardes % 50000 === 0) console.log(`  … ${gardes} antennes importées`); }
  }
  await flush(batch);
  const n = await pool.query(`SELECT COUNT(*)::bigint AS n FROM cell_towers`);
  console.log(`Terminé. Lignes lues : ${lus}, antennes gardées : ${gardes}. Total en base : ${n.rows[0].n}`);
  await pool.end();
})().catch((e) => { console.error(e); process.exit(1); });
