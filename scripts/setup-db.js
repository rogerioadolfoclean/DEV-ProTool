// Création du schéma + données initiales — Plateforme OmniComm 360°
// Usage : node scripts/setup-db.js (lit DATABASE_URL depuis .env)
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const env = fs.readFileSync(path.join(__dirname, "..", ".env"), "utf8");
const url = env.match(/DATABASE_URL="([^"]+)"/)[1];

const SCHEMA = `
-- ===== Multi-tenant (RF-017) =====
CREATE TABLE IF NOT EXISTS tenants (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(120) UNIQUE NOT NULL,
  slug VARCHAR(60) UNIQUE NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'standard' CHECK (type IN ('standard','revendeur')),
  white_label BOOLEAN DEFAULT FALSE,
  pays VARCHAR(60) DEFAULT 'RDC',
  secteur VARCHAR(40),
  actif BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS utilisateurs (
  id SERIAL PRIMARY KEY,
  tenant_id INT REFERENCES tenants(id),
  nom VARCHAR(120) NOT NULL,
  email VARCHAR(120) UNIQUE NOT NULL,
  mot_de_passe_hash VARCHAR(200) NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'developer' CHECK (role IN ('admin','tenant_admin','developer','viewer')),
  actif BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== Clés API (RF-016) =====
CREATE TABLE IF NOT EXISTS api_keys (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL REFERENCES tenants(id),
  nom VARCHAR(120) NOT NULL,
  prefixe VARCHAR(20) NOT NULL,
  cle_hash VARCHAR(128) UNIQUE NOT NULL,
  environnement VARCHAR(12) NOT NULL DEFAULT 'sandbox' CHECK (environnement IN ('production','sandbox')),
  scopes TEXT[] NOT NULL DEFAULT '{messages,voix,iot,numeros,webhooks,analytics}',
  derniere_utilisation TIMESTAMPTZ,
  actif BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== Messagerie omnicanale (RF-001..006) =====
CREATE TABLE IF NOT EXISTS contacts (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL REFERENCES tenants(id),
  nom VARCHAR(120),
  telephone VARCHAR(30),
  email VARCHAR(120),
  pays VARCHAR(60),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS optouts (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL REFERENCES tenants(id),
  canal VARCHAR(20) NOT NULL CHECK (canal IN ('sms','whatsapp','email','push','fax','voix')),
  identifiant VARCHAR(120) NOT NULL,
  source VARCHAR(40) DEFAULT 'demande_client',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, canal, identifiant)
);

CREATE TABLE IF NOT EXISTS routes_tarifs (
  id SERIAL PRIMARY KEY,
  canal VARCHAR(20) NOT NULL,
  pays VARCHAR(60) NOT NULL,
  prefixe VARCHAR(10) NOT NULL,
  operateur VARCHAR(60) NOT NULL,
  cout_par_unite NUMERIC(10,5) NOT NULL,
  priorite INT DEFAULT 1,
  actif BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL REFERENCES tenants(id),
  api_key_id INT REFERENCES api_keys(id),
  canal VARCHAR(20) NOT NULL CHECK (canal IN ('sms','whatsapp','rcs','email','push','fax')),
  direction VARCHAR(10) NOT NULL DEFAULT 'sortant' CHECK (direction IN ('sortant','entrant')),
  de VARCHAR(160) NOT NULL,
  vers VARCHAR(160) NOT NULL,
  sujet VARCHAR(200),
  contenu TEXT NOT NULL,
  statut VARCHAR(20) NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('en_attente','envoye','livre','echoue','rejete_dnd')),
  categorie VARCHAR(20) DEFAULT 'transactionnel' CHECK (categorie IN ('transactionnel','marketing')),
  operateur_route VARCHAR(60),
  pays_destination VARCHAR(60),
  cout NUMERIC(10,5) DEFAULT 0,
  erreur TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_messages_tenant ON messages(tenant_id, created_at DESC);

-- ===== Voix, VoIP, Radio Web (RF-007..011) =====
CREATE TABLE IF NOT EXISTS ivr_flows (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL REFERENCES tenants(id),
  nom VARCHAR(120) NOT NULL,
  description TEXT,
  config JSONB NOT NULL DEFAULT '{}',
  actif BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appels (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL REFERENCES tenants(id),
  direction VARCHAR(10) NOT NULL DEFAULT 'sortant' CHECK (direction IN ('sortant','entrant')),
  de VARCHAR(30) NOT NULL,
  vers VARCHAR(30) NOT NULL,
  statut VARCHAR(20) NOT NULL DEFAULT 'initie' CHECK (statut IN ('initie','sonnerie','en_cours','termine','echoue','sans_reponse','boite_vocale')),
  type VARCHAR(20) DEFAULT 'standard' CHECK (type IN ('standard','ivr','conference','ia','webrtc')),
  ivr_flow_id INT REFERENCES ivr_flows(id),
  duree_secondes INT DEFAULT 0,
  mos_score NUMERIC(3,2),
  attestation_stir VARCHAR(1) CHECK (attestation_stir IN ('A','B','C')),
  cout NUMERIC(10,5) DEFAULT 0,
  enregistrement_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_appels_tenant ON appels(tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS conferences (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL REFERENCES tenants(id),
  nom VARCHAR(120) NOT NULL,
  participants INT DEFAULT 0,
  duree_minutes INT DEFAULT 0,
  statut VARCHAR(20) DEFAULT 'planifiee' CHECK (statut IN ('planifiee','en_cours','terminee')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agents_ia (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL REFERENCES tenants(id),
  nom VARCHAR(120) NOT NULL,
  langue VARCHAR(40) DEFAULT 'français',
  voix VARCHAR(40) DEFAULT 'féminine',
  modele_llm VARCHAR(60) DEFAULT 'claude-sonnet',
  prompt_systeme TEXT,
  actif BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversations_ia (
  id SERIAL PRIMARY KEY,
  agent_id INT NOT NULL REFERENCES agents_ia(id),
  appel_id INT REFERENCES appels(id),
  transcription TEXT,
  duree_secondes INT DEFAULT 0,
  satisfaction INT CHECK (satisfaction BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sip_trunks (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL REFERENCES tenants(id),
  nom VARCHAR(120) NOT NULL,
  domaine VARCHAR(160) NOT NULL,
  ips_autorisees TEXT[] DEFAULT '{}',
  codecs TEXT[] DEFAULT '{G.711,G.729,Opus}',
  canaux_max INT DEFAULT 10,
  statut VARCHAR(20) DEFAULT 'actif' CHECK (statut IN ('actif','suspendu','configuration')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS flux_streaming (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL REFERENCES tenants(id),
  nom VARCHAR(120) NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'radio' CHECK (type IN ('radio','podcast','video')),
  protocole VARCHAR(20) NOT NULL DEFAULT 'Icecast' CHECK (protocole IN ('HLS','Icecast','Shoutcast','RTMP')),
  url_flux TEXT,
  bitrate_kbps INT DEFAULT 128,
  auditeurs_actuels INT DEFAULT 0,
  auditeurs_pic INT DEFAULT 0,
  statut VARCHAR(20) DEFAULT 'en_ligne' CHECK (statut IN ('en_ligne','hors_ligne','maintenance')),
  serveur VARCHAR(160),
  port INT,
  mount_point VARCHAR(160),
  username VARCHAR(80),
  mot_passe VARCHAR(120),
  encodage VARCHAR(10) DEFAULT 'MP3',
  derniere_verif TIMESTAMPTZ,
  titre_en_cours VARCHAR(200),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== Connectivité & IoT (RF-012..015) =====
CREATE TABLE IF NOT EXISTS sims (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL REFERENCES tenants(id),
  iccid VARCHAR(22) UNIQUE NOT NULL,
  msisdn VARCHAR(20),
  imsi VARCHAR(18),
  statut VARCHAR(20) NOT NULL DEFAULT 'inactive' CHECK (statut IN ('active','suspendue','inactive','resiliee')),
  apn VARCHAR(60) DEFAULT 'iot.omnicomm360.cd',
  secteur VARCHAR(30) DEFAULT 'agritech' CHECK (secteur IN ('agritech','minier','logistique','energie','autre')),
  data_mois_mo NUMERIC(10,2) DEFAULT 0,
  etiquette VARCHAR(120),
  derniere_activite TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sim_evenements (
  id SERIAL PRIMARY KEY,
  sim_id INT NOT NULL REFERENCES sims(id),
  type VARCHAR(30) NOT NULL CHECK (type IN ('activation','suspension','reactivation','diagnostic','alerte_data','changement_apn')),
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS geolocalisations (
  id SERIAL PRIMARY KEY,
  sim_id INT NOT NULL REFERENCES sims(id),
  latitude NUMERIC(9,6) NOT NULL,
  longitude NUMERIC(9,6) NOT NULL,
  precision_m INT DEFAULT 500,
  methode VARCHAR(30) DEFAULT 'triangulation',
  cellules JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS couverture_reseau (
  id SERIAL PRIMARY KEY,
  operateur VARCHAR(60) NOT NULL,
  pays VARCHAR(60) NOT NULL DEFAULT 'RDC',
  zone VARCHAR(80) NOT NULL,
  technologie VARCHAR(10) NOT NULL CHECK (technologie IN ('2G','3G','4G','5G')),
  qualite VARCHAR(20) NOT NULL CHECK (qualite IN ('excellente','bonne','moyenne','faible','inexistante')),
  population_couverte_pct INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS numeros_virtuels (
  id SERIAL PRIMARY KEY,
  tenant_id INT REFERENCES tenants(id),
  numero VARCHAR(30) UNIQUE NOT NULL,
  pays VARCHAR(60) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('local','mobile','gratuit','surtaxe')),
  capacites TEXT[] DEFAULT '{voix,sms}',
  cout_mensuel NUMERIC(10,2) NOT NULL DEFAULT 1.00,
  statut VARCHAR(20) DEFAULT 'disponible' CHECK (statut IN ('disponible','attribue','porte','resilie')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== BSS/OSS (RF-017..020) =====
CREATE TABLE IF NOT EXISTS plans_tarifaires (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(80) UNIQUE NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'prepaye' CHECK (type IN ('prepaye','postpaye')),
  prix_mensuel NUMERIC(10,2) NOT NULL DEFAULT 0,
  inclus JSONB NOT NULL DEFAULT '{}',
  actif BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS abonnements (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL REFERENCES tenants(id),
  plan_id INT NOT NULL REFERENCES plans_tarifaires(id),
  mode VARCHAR(20) NOT NULL DEFAULT 'prepaye' CHECK (mode IN ('prepaye','postpaye')),
  solde NUMERIC(12,2) DEFAULT 0,
  statut VARCHAR(20) DEFAULT 'actif' CHECK (statut IN ('actif','suspendu','resilie')),
  date_debut DATE DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS compteurs_usage (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL REFERENCES tenants(id),
  service VARCHAR(40) NOT NULL,
  quantite NUMERIC(14,2) NOT NULL DEFAULT 0,
  unite VARCHAR(20) NOT NULL DEFAULT 'unite',
  cout NUMERIC(12,4) NOT NULL DEFAULT 0,
  periode VARCHAR(7) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS factures (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL REFERENCES tenants(id),
  numero VARCHAR(30) UNIQUE NOT NULL,
  periode VARCHAR(7) NOT NULL,
  montant NUMERIC(12,2) NOT NULL,
  devise VARCHAR(3) DEFAULT 'USD',
  statut VARCHAR(20) DEFAULT 'en_attente' CHECK (statut IN ('payee','en_attente','en_retard','annulee')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== CDR & Surveillance (RF-021..024) =====
CREATE TABLE IF NOT EXISTS cdrs (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL REFERENCES tenants(id),
  type VARCHAR(20) NOT NULL CHECK (type IN ('voix','sms','data','email','fax')),
  source VARCHAR(160) NOT NULL,
  destination VARCHAR(160) NOT NULL,
  debut TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duree_secondes INT DEFAULT 0,
  cout NUMERIC(10,5) DEFAULT 0,
  operateur VARCHAR(60),
  pays_destination VARCHAR(60),
  brut JSONB DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_cdrs_tenant ON cdrs(tenant_id, debut DESC);

CREATE TABLE IF NOT EXISTS webhooks (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL REFERENCES tenants(id),
  url TEXT NOT NULL,
  evenements TEXT[] NOT NULL DEFAULT '{message.livre,message.echoue,appel.termine}',
  secret VARCHAR(80) NOT NULL,
  actif BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_livraisons (
  id SERIAL PRIMARY KEY,
  webhook_id INT NOT NULL REFERENCES webhooks(id),
  evenement VARCHAR(60) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  statut_http INT,
  tentatives INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alertes_fraude (
  id SERIAL PRIMARY KEY,
  tenant_id INT REFERENCES tenants(id),
  type VARCHAR(30) NOT NULL CHECK (type IN ('sim_box','spoofing','fuite_revenus','trafic_anormal','sim_clonee')),
  gravite VARCHAR(20) NOT NULL DEFAULT 'moyenne' CHECK (gravite IN ('critique','haute','moyenne','basse')),
  score INT DEFAULT 50 CHECK (score BETWEEN 0 AND 100),
  description TEXT NOT NULL,
  statut VARCHAR(20) DEFAULT 'nouvelle' CHECK (statut IN ('nouvelle','en_cours','resolue','faux_positif')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  utilisateur_email VARCHAR(120) NOT NULL,
  utilisateur_nom VARCHAR(120) NOT NULL,
  role VARCHAR(30) NOT NULL,
  action VARCHAR(120) NOT NULL,
  cible VARCHAR(200),
  details TEXT,
  adresse_ip VARCHAR(60),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS logs_api (
  id SERIAL PRIMARY KEY,
  tenant_id INT REFERENCES tenants(id),
  api_key_id INT REFERENCES api_keys(id),
  methode VARCHAR(10) NOT NULL,
  endpoint VARCHAR(200) NOT NULL,
  statut_http INT NOT NULL,
  duree_ms INT DEFAULT 0,
  ip VARCHAR(60),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_logs_api_tenant ON logs_api(tenant_id, created_at DESC);
`;

function h(cle) {
  return crypto.createHash("sha256").update(cle).digest("hex");
}
function il(jours) {
  // timestamp il y a N jours (avec heure aléatoire)
  const d = new Date(Date.now() - jours * 86400000 - Math.floor(Math.random() * 43200000));
  return d.toISOString();
}

(async () => {
  const pool = new Pool({ connectionString: url, max: 3 });

  console.log("Création du schéma (29 tables)…");
  await pool.query(SCHEMA);

  const dejaFait = await pool.query("SELECT COUNT(*)::int AS n FROM tenants");
  if (dejaFait.rows[0].n > 0) {
    console.log("Données déjà présentes — schéma seulement.");
    await pool.end();
    return;
  }

  console.log("Insertion des données initiales…");

  // Tenants
  await pool.query(`INSERT INTO tenants (nom, slug, type, white_label, pays, secteur) VALUES
    ('OmniComm Principal','omnicomm','standard',FALSE,'RDC','telecom'),
    ('AgriTech Kivu SARL','agritech-kivu','standard',FALSE,'RDC','agritech'),
    ('KatangaTel (Revendeur)','katangatel','revendeur',TRUE,'RDC','minier')`);

  // Admin Rogerio + comptes de démonstration
  const mdpAdmin = await bcrypt.hash("Omni360!2026", 10);
  const mdpDemo = await bcrypt.hash("Demo360!2026", 10);
  await pool.query(
    `INSERT INTO utilisateurs (tenant_id, nom, email, mot_de_passe_hash, role) VALUES
    (1,'Rogerio Celestina Kabongo','rogerioadolfoclean@gmail.com',$1,'admin'),
    (1,'Nzangi Adolphe','nzangi.adolphe@omnicomm360.cd',$2,'tenant_admin'),
    (2,'Marie Kahindo','dev@agritech-kivu.cd',$2,'developer'),
    (3,'Jean Ilunga','admin@katangatel.cd',$2,'tenant_admin')`,
    [mdpAdmin, mdpDemo]
  );

  // Clés API (les clés en clair sont affichées une seule fois ici)
  const cleLive = "omni_live_" + crypto.randomBytes(18).toString("hex");
  const cleTest = "omni_test_" + crypto.randomBytes(18).toString("hex");
  await pool.query(
    `INSERT INTO api_keys (tenant_id, nom, prefixe, cle_hash, environnement) VALUES
    (1,'Clé production principale',$1,$2,'production'),
    (1,'Clé sandbox',$3,$4,'sandbox')`,
    [cleLive.slice(0, 15), h(cleLive), cleTest.slice(0, 15), h(cleTest)]
  );
  console.log("CLE_API_PRODUCTION=" + cleLive);
  console.log("CLE_API_SANDBOX=" + cleTest);

  // Routage Least-Cost (RF-001)
  await pool.query(`INSERT INTO routes_tarifs (canal, pays, prefixe, operateur, cout_par_unite, priorite) VALUES
    ('sms','RDC','+243','Vodacom RDC',0.0210,1),
    ('sms','RDC','+243','Airtel RDC',0.0230,2),
    ('sms','RDC','+243','Orange RDC',0.0245,3),
    ('sms','RDC','+243','Africell RDC',0.0260,4),
    ('sms','Brésil','+55','Vivo',0.0180,1),
    ('sms','Brésil','+55','Claro',0.0195,2),
    ('sms','France','+33','Orange France',0.0450,1),
    ('sms','USA','+1','T-Mobile US',0.0075,1),
    ('voix','RDC','+243','Vodacom RDC',0.1450,1),
    ('voix','RDC','+243','Airtel RDC',0.1520,2),
    ('voix','Brésil','+55','Vivo',0.0890,1),
    ('voix','France','+33','Orange France',0.0950,1),
    ('whatsapp','RDC','+243','Meta Cloud API',0.0350,1),
    ('whatsapp','Brésil','+55','Meta Cloud API',0.0300,1)`);

  // Contacts + opt-outs DND (RF-006)
  await pool.query(`INSERT INTO contacts (tenant_id, nom, telephone, email, pays) VALUES
    (1,'Patrick Mbuyi','+243811234567','p.mbuyi@exemple.cd','RDC'),
    (1,'Sarah Tshala','+243977654321','s.tshala@exemple.cd','RDC'),
    (1,'Carlos Oliveira','+5511987654321','carlos@exemplo.br','Brésil'),
    (2,'Coopérative Kabare','+243853336699','contact@coop-kabare.cd','RDC'),
    (3,'Mine Kamoto Ops','+243990001122','ops@kamoto.cd','RDC')`);
  await pool.query(`INSERT INTO optouts (tenant_id, canal, identifiant, source) VALUES
    (1,'sms','+243818889977','envoi STOP'),
    (1,'email','ancien.client@exemple.cd','lien de désinscription'),
    (1,'whatsapp','+243979998877','demande client')`);

  // Messages multicanaux (RF-001..005)
  const canaux = [
    ["sms", "+243811234567", "OmniComm", "Votre code de vérification est 493021. Valable 5 minutes.", "transactionnel", "Vodacom RDC", "RDC", 0.021],
    ["sms", "+243977654321", "OmniComm", "Promo : -20% sur les forfaits data ce week-end !", "marketing", "Vodacom RDC", "RDC", 0.021],
    ["whatsapp", "+5511987654321", "OmniComm", "Bonjour Carlos, votre commande #4521 a été expédiée.", "transactionnel", "Meta Cloud API", "Brésil", 0.03],
    ["email", "s.tshala@exemple.cd", "noreply@omnicomm360.cd", "Confirmation de votre inscription à OmniComm 360°.", "transactionnel", "SMTP direct", "RDC", 0.0002],
    ["push", "device_fcm_8842a", "app-agritech", "Alerte capteur : humidité du sol sous le seuil (parcelle 12).", "transactionnel", "FCM", "RDC", 0.0001],
    ["fax", "+33145678901", "+243815550000", "Bon de commande N°2026-0711 — 3 pages.", "transactionnel", "FoIP Gateway", "France", 0.08],
    ["rcs", "+243811234567", "OmniComm", "Carte interactive : suivez votre livraison en temps réel.", "marketing", "Vodacom RDC", "RDC", 0.028],
  ];
  for (let i = 0; i < 32; i++) {
    const c = canaux[i % canaux.length];
    const statut = i % 9 === 0 ? "echoue" : i % 7 === 0 ? "envoye" : "livre";
    await pool.query(
      `INSERT INTO messages (tenant_id, canal, de, vers, contenu, statut, categorie, operateur_route, pays_destination, cout, created_at, delivered_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        (i % 3) + 1, c[0], c[2], c[1], c[3], statut, c[4], c[5], c[6], c[7],
        il(Math.floor(i / 3)), statut === "livre" ? il(Math.floor(i / 3)) : null,
      ]
    );
  }
  // Un rejet DND pour la démo de conformité
  await pool.query(`INSERT INTO messages (tenant_id, canal, de, vers, contenu, statut, categorie, erreur, created_at)
    VALUES (1,'sms','OmniComm','+243818889977','Promo forfaits data','rejete_dnd','marketing','Destinataire inscrit sur liste DND (opt-out)', NOW())`);

  // IVR + appels (RF-007)
  await pool.query(`INSERT INTO ivr_flows (tenant_id, nom, description, config) VALUES
    (1,'Accueil principal','Menu d''accueil 3 choix + boîte vocale','{"etapes":[{"type":"lecture","texte":"Bienvenue chez OmniComm 360"},{"type":"menu","choix":{"1":"commercial","2":"support","3":"facturation"}},{"type":"boite_vocale"}]}'),
    (1,'Support technique','File d''attente support avec rappel automatique','{"etapes":[{"type":"lecture","texte":"Service support"},{"type":"file_attente","musique":true},{"type":"rappel_auto"}]}')`);
  for (let i = 0; i < 24; i++) {
    const dir = i % 4 === 0 ? "entrant" : "sortant";
    const types = ["standard", "ivr", "conference", "ia", "webrtc"];
    const statut = i % 8 === 0 ? "sans_reponse" : i % 11 === 0 ? "echoue" : "termine";
    const duree = statut === "termine" ? 30 + Math.floor(Math.random() * 600) : 0;
    await pool.query(
      `INSERT INTO appels (tenant_id, direction, de, vers, statut, type, ivr_flow_id, duree_secondes, mos_score, attestation_stir, cout, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        (i % 3) + 1, dir, dir === "entrant" ? "+243811234567" : "+243815550000",
        dir === "entrant" ? "+243815550000" : "+2438" + String(10000000 + i * 137).slice(0, 8),
        statut, types[i % 5], i % 5 === 1 ? 1 : null, duree,
        statut === "termine" ? (3.8 + Math.random() * 1.1).toFixed(2) : null,
        ["A", "A", "B", "A", "C"][i % 5],
        (duree / 60) * 0.145, il(Math.floor(i / 2)),
      ]
    );
  }
  await pool.query(`INSERT INTO conferences (tenant_id, nom, participants, duree_minutes, statut) VALUES
    (1,'Réunion hebdo équipe commerciale',8,45,'terminee'),
    (2,'Point coopératives Kivu',12,60,'terminee'),
    (1,'Comité de direction',5,0,'planifiee')`);

  // IA conversationnelle (RF-008)
  await pool.query(`INSERT INTO agents_ia (tenant_id, nom, langue, voix, modele_llm, prompt_systeme) VALUES
    (1,'Amina — Accueil vocal','français','féminine','claude-sonnet','Tu es Amina, assistante vocale d''OmniComm 360. Accueille, qualifie et route les appels.'),
    (1,'Kwame — Support Lingala','lingala','masculine','claude-sonnet','Ozali Kwame, mosungi ya OmniComm 360. Salisa bakiliya na lingala.')`);
  await pool.query(`INSERT INTO conversations_ia (agent_id, appel_id, transcription, duree_secondes, satisfaction) VALUES
    (1,4,'Client : Je veux connaître mon solde. Amina : Votre solde est de 45,20 USD. Autre chose ?',95,5),
    (1,9,'Client : Problème d''envoi SMS. Amina : Je vous transfère au support technique.',60,4),
    (2,14,'Kiliya : Nazali na mokakatano na SIM. Kwame : Nakosalisa yo sikoyo.',180,5)`);

  // SIP Trunks (RF-009)
  await pool.query(`INSERT INTO sip_trunks (tenant_id, nom, domaine, ips_autorisees, canaux_max, statut) VALUES
    (1,'Trunk principal Kinshasa','sip.omnicomm360.cd','{41.243.11.5,41.243.11.6}',60,'actif'),
    (3,'Trunk KatangaTel','sip.katangatel.cd','{102.68.44.10}',30,'actif')`);

  // Radio Web / Streaming (RF-010)
  await pool.query(`INSERT INTO flux_streaming (tenant_id, nom, type, protocole, url_flux, bitrate_kbps, auditeurs_actuels, auditeurs_pic, statut) VALUES
    (1,'Radio Congo Web','radio','Icecast','https://stream.omnicomm360.cd/radio-congo',128,342,1250,'en_ligne'),
    (1,'Podcast Tech RDC','podcast','HLS','https://stream.omnicomm360.cd/podcast-tech',96,58,410,'en_ligne'),
    (2,'AgriInfo FM','radio','HLS','https://stream.omnicomm360.cd/agriinfo',128,127,890,'en_ligne'),
    (1,'OmniComm TV (démo)','video','HLS','https://stream.omnicomm360.cd/tv-demo',2500,23,150,'maintenance')`);

  // SIMs IoT (RF-012) + événements + géolocalisation (RF-013)
  const secteurs = ["agritech", "minier", "logistique", "agritech", "minier"];
  const etiquettes = [
    "Capteur humidité — Kabare P12", "Excavatrice 07 — Kolwezi", "Camion KIN-LUB 04",
    "Station météo — Masisi", "Foreuse 12 — Likasi",
  ];
  // Coordonnées plausibles RDC : Kivu (-2.5, 28.8) / Katanga (-10.7, 25.4)
  const coords = [[-2.491, 28.842], [-10.716, 25.472], [-5.89, 22.42], [-1.398, 28.81], [-10.981, 26.733]];
  for (let i = 0; i < 15; i++) {
    const statut = i % 6 === 5 ? "suspendue" : i % 6 === 4 ? "inactive" : "active";
    const r = await pool.query(
      `INSERT INTO sims (tenant_id, iccid, msisdn, imsi, statut, secteur, data_mois_mo, etiquette, derniere_activite)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [
        i % 2 === 0 ? 2 : 3,
        "8924301" + String(100000000000 + i * 7919),
        "+24399" + String(1000000 + i * 111),
        "630019" + String(100000000 + i * 333),
        statut, secteurs[i % 5],
        (Math.random() * 480).toFixed(2),
        etiquettes[i % 5] + " #" + (i + 1),
        statut === "active" ? il(0) : null,
      ]
    );
    const simId = r.rows[0].id;
    await pool.query(
      `INSERT INTO sim_evenements (sim_id, type, details, created_at) VALUES
       ($1,'activation','Activation initiale via API',$2),
       ($1,'diagnostic','Diagnostic OK — signal -87 dBm, latence 210 ms',$3)`,
      [simId, il(30), il(2)]
    );
    if (statut === "active") {
      const [lat, lon] = coords[i % 5];
      for (let j = 0; j < 3; j++) {
        await pool.query(
          `INSERT INTO geolocalisations (sim_id, latitude, longitude, precision_m, cellules, created_at)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [
            simId,
            (lat + (Math.random() - 0.5) * 0.02).toFixed(6),
            (lon + (Math.random() - 0.5) * 0.02).toFixed(6),
            200 + Math.floor(Math.random() * 800),
            JSON.stringify([{ cellId: 4400 + i * 3 + j, rssi: -80 - Math.floor(Math.random() * 20) }]),
            il(j),
          ]
        );
      }
    }
  }

  // Couverture réseau RDC (RF-014)
  const zones = ["Kinshasa", "Lubumbashi", "Goma", "Bukavu", "Kisangani", "Kolwezi", "Matadi", "Mbuji-Mayi"];
  const opsCouv = [
    ["Vodacom RDC", { Kinshasa: ["4G", "excellente", 92], Lubumbashi: ["4G", "bonne", 85], Goma: ["4G", "bonne", 78], Bukavu: ["3G", "moyenne", 65], Kisangani: ["3G", "moyenne", 60], Kolwezi: ["4G", "bonne", 80], Matadi: ["3G", "bonne", 70], "Mbuji-Mayi": ["3G", "moyenne", 58] }],
    ["Airtel RDC", { Kinshasa: ["4G", "excellente", 90], Lubumbashi: ["4G", "bonne", 82], Goma: ["3G", "moyenne", 70], Bukavu: ["3G", "moyenne", 62], Kisangani: ["3G", "faible", 45], Kolwezi: ["4G", "bonne", 75], Matadi: ["3G", "moyenne", 60], "Mbuji-Mayi": ["2G", "faible", 40] }],
    ["Orange RDC", { Kinshasa: ["4G", "excellente", 88], Lubumbashi: ["4G", "bonne", 80], Goma: ["4G", "bonne", 74], Bukavu: ["3G", "moyenne", 60], Kisangani: ["3G", "moyenne", 55], Kolwezi: ["3G", "moyenne", 65], Matadi: ["4G", "bonne", 72], "Mbuji-Mayi": ["3G", "faible", 42] }],
    ["Africell RDC", { Kinshasa: ["4G", "bonne", 75], Lubumbashi: ["3G", "moyenne", 55], Goma: ["3G", "faible", 40], Bukavu: ["2G", "faible", 30], Kisangani: ["2G", "faible", 25], Kolwezi: ["3G", "faible", 38], Matadi: ["3G", "moyenne", 50], "Mbuji-Mayi": ["2G", "inexistante", 0] }],
  ];
  for (const [op, carte] of opsCouv) {
    for (const z of zones) {
      const [tech, qual, pop] = carte[z];
      await pool.query(
        `INSERT INTO couverture_reseau (operateur, pays, zone, technologie, qualite, population_couverte_pct) VALUES ($1,'RDC',$2,$3,$4,$5)`,
        [op, z, tech, qual, pop]
      );
    }
  }

  // Numéros virtuels (RF-015)
  await pool.query(`INSERT INTO numeros_virtuels (tenant_id, numero, pays, type, capacites, cout_mensuel, statut) VALUES
    (1,'+243900100200','RDC','local','{voix,sms}',2.00,'attribue'),
    (1,'+243800555000','RDC','gratuit','{voix}',15.00,'attribue'),
    (2,'+243900300400','RDC','mobile','{voix,sms,data}',3.50,'attribue'),
    (3,'+243905555777','RDC','surtaxe','{voix}',25.00,'attribue'),
    (NULL,'+243900700800','RDC','local','{voix,sms}',2.00,'disponible'),
    (NULL,'+5511300400500','Brésil','local','{voix,sms}',1.80,'disponible'),
    (NULL,'+33170800900','France','local','{voix,sms,fax}',1.50,'disponible'),
    (NULL,'+18445550123','USA','gratuit','{voix}',12.00,'disponible')`);

  // Plans + abonnements (RF-018, RF-020)
  await pool.query(`INSERT INTO plans_tarifaires (nom, type, prix_mensuel, inclus) VALUES
    ('Starter','prepaye',0,'{"sms":500,"voix_min":100,"emails":5000,"sims":5}'),
    ('Business','postpaye',99,'{"sms":10000,"voix_min":2500,"emails":100000,"sims":50,"numeros":5}'),
    ('Enterprise MVNO','postpaye',499,'{"sms":-1,"voix_min":-1,"emails":-1,"sims":1000,"numeros":50,"white_label":true}')`);
  await pool.query(`INSERT INTO abonnements (tenant_id, plan_id, mode, solde, statut) VALUES
    (1,3,'postpaye',0,'actif'),
    (2,1,'prepaye',132.50,'actif'),
    (3,2,'postpaye',0,'actif')`);

  // Usage + factures
  const services = [["sms", "unite", 0.021], ["voix", "minute", 0.145], ["data_iot", "Mo", 0.008], ["email", "unite", 0.0002], ["streaming", "heure", 0.05]];
  for (const t of [1, 2, 3]) {
    for (const [srv, unite, prix] of services) {
      const q = Math.floor(500 + Math.random() * 8000);
      await pool.query(
        `INSERT INTO compteurs_usage (tenant_id, service, quantite, unite, cout, periode) VALUES ($1,$2,$3,$4,$5,'2026-07')`,
        [t, srv, q, unite, (q * prix).toFixed(4)]
      );
    }
  }
  await pool.query(`INSERT INTO factures (tenant_id, numero, periode, montant, statut) VALUES
    (1,'FAC-2026-06-001','2026-06',1240.50,'payee'),
    (2,'FAC-2026-06-002','2026-06',86.20,'payee'),
    (3,'FAC-2026-06-003','2026-06',432.75,'en_retard'),
    (1,'FAC-2026-07-001','2026-07',890.00,'en_attente')`);

  // CDRs (RF-023)
  for (let i = 0; i < 60; i++) {
    const types = ["voix", "sms", "data", "email", "fax"];
    const type = types[i % 5];
    const duree = type === "voix" ? 30 + Math.floor(Math.random() * 500) : 0;
    await pool.query(
      `INSERT INTO cdrs (tenant_id, type, source, destination, debut, duree_secondes, cout, operateur, pays_destination) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        (i % 3) + 1, type,
        "+243815550000",
        type === "email" ? "client" + i + "@exemple.cd" : "+2438" + String(10000000 + i * 271).slice(0, 8),
        il(Math.floor(i / 4)), duree,
        type === "voix" ? ((duree / 60) * 0.145).toFixed(5) : type === "sms" ? 0.021 : 0.005,
        ["Vodacom RDC", "Airtel RDC", "Orange RDC"][i % 3], "RDC",
      ]
    );
  }

  // Webhooks (RF-021)
  await pool.query(`INSERT INTO webhooks (tenant_id, url, evenements, secret) VALUES
    (1,'https://exemple.cd/webhooks/omnicomm','{message.livre,message.echoue,appel.termine,sim.alerte}','whsec_${crypto.randomBytes(12).toString("hex")}'),
    (2,'https://agritech-kivu.cd/api/notifications','{sim.alerte,geoloc.mise_a_jour}','whsec_${crypto.randomBytes(12).toString("hex")}')`);
  for (let i = 0; i < 12; i++) {
    await pool.query(
      `INSERT INTO webhook_livraisons (webhook_id, evenement, payload, statut_http, tentatives, created_at) VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        (i % 2) + 1,
        ["message.livre", "appel.termine", "sim.alerte"][i % 3],
        JSON.stringify({ id: 1000 + i, statut: "livre", horodatage: new Date().toISOString() }),
        i % 6 === 5 ? 500 : 200, i % 6 === 5 ? 3 : 1, il(Math.floor(i / 2)),
      ]
    );
  }

  // Alertes fraude (RF-019, RF-024)
  await pool.query(`INSERT INTO alertes_fraude (tenant_id, type, gravite, score, description, statut) VALUES
    (NULL,'sim_box','critique',94,'Détection SIM Box : 847 appels internationaux terminés localement via 6 SIM du même lot (préfixe +243 99). Pattern d''appels séquentiels détecté.','en_cours'),
    (1,'spoofing','haute',81,'Tentative de spoofing CLI : 23 appels avec numéro présenté +243 81 555 0000 sans attestation STIR/SHAKEN valide (attestation C).','nouvelle'),
    (3,'fuite_revenus','moyenne',62,'Écart de facturation détecté : 1 240 minutes facturées vs 1 395 minutes CDR sur juin 2026 (écart 11%).','en_cours'),
    (2,'trafic_anormal','basse',35,'Pic de trafic data inhabituel sur 3 SIM AgriTech (x4 vs moyenne) — probable mise à jour firmware capteurs.','resolue'),
    (NULL,'sim_clonee','haute',77,'IMSI 630019100002331 détecté simultanément sur 2 cellules distantes de 900 km (Goma / Kinshasa).','nouvelle')`);

  // Logs API (RF-016)
  const endpoints = [
    ["POST", "/api/v1/messages", 201], ["GET", "/api/v1/messages", 200], ["POST", "/api/v1/calls", 201],
    ["GET", "/api/v1/sims", 200], ["POST", "/api/v1/sims/3/suspend", 200], ["GET", "/api/v1/numbers", 200],
    ["GET", "/api/v1/cdrs", 200], ["POST", "/api/v1/webhooks", 201], ["GET", "/api/v1/analytics/summary", 200],
    ["POST", "/api/v1/messages", 422], ["GET", "/api/v1/messages/99999", 404], ["POST", "/api/v1/calls", 401],
  ];
  for (let i = 0; i < 48; i++) {
    const [m, e, s] = endpoints[i % endpoints.length];
    await pool.query(
      `INSERT INTO logs_api (tenant_id, api_key_id, methode, endpoint, statut_http, duree_ms, ip, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [1, s === 401 ? null : (i % 2) + 1, m, e, s, 20 + Math.floor(Math.random() * 300), "41.243.11." + ((i % 40) + 2), il(Math.floor(i / 8))]
    );
  }

  const n = await pool.query(`SELECT
    (SELECT COUNT(*) FROM messages) AS messages,
    (SELECT COUNT(*) FROM appels) AS appels,
    (SELECT COUNT(*) FROM sims) AS sims,
    (SELECT COUNT(*) FROM cdrs) AS cdrs,
    (SELECT COUNT(*) FROM couverture_reseau) AS couverture`);
  console.log("Terminé :", n.rows[0]);
  await pool.end();
})().catch((e) => {
  console.error("ERREUR:", e.message);
  process.exit(1);
});
