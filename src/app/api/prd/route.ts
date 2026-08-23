import { NextResponse } from "next/server";
import { Pool } from "pg";

const templates: Record<string, { name: string; dimensions: string[]; modules: string[] }> = {
  web: { name: "Application Web", dimensions: ["Web", "SaaS"], modules: ["UX/UI", "Frontend", "Backend", "API"] },
  "ai-ml": { name: "IA & Machine Learning", dimensions: ["IA", "Machine Learning"], modules: ["AI Engine", "Evaluation", "Prompting", "Monitoring"] },
  "api-platform": { name: "API Platform", dimensions: ["API", "Developer Platform"], modules: ["API", "API Keys", "Rate Limiting", "OpenAPI"] },
  "saas-cloud": { name: "SaaS / Cloud", dimensions: ["SaaS", "Cloud", "Multi-tenant"], modules: ["Organizations", "RBAC", "Billing", "Storage"] },
  payments: { name: "Paiement & Abonnement", dimensions: ["Paiement", "Billing"], modules: ["Checkout", "Subscriptions", "Credits", "Webhooks"] },
  "streaming-media": { name: "Streaming & Média", dimensions: ["Streaming", "Média"], modules: ["Media", "Storage", "Distribution", "Analytics"] },
  "music-ai": { name: "Musique IA", dimensions: ["IA", "Musique", "Audio Processing"], modules: ["Génération IA", "Éditeur Audio", "Stems", "Audio Storage"] },
};

function analyzeProject(form: any, selected: string[]) {
  const chosen = selected.length ? selected : ["web"];
  const defs = chosen.map(s => templates[s]).filter(Boolean);
  const dimensions = [...new Set(defs.flatMap(d => d.dimensions))];
  const modules = [...new Set(defs.flatMap(d => d.modules))];
  const text = JSON.stringify(form).toLowerCase();
  if (/stripe|paiement|abonnement|crédit/.test(text)) dimensions.push("Paiement");
  if (/api|sdk|webhook/.test(text)) dimensions.push("API");
  if (/audio|musique|wav|mp3|stems/.test(text)) dimensions.push("Audio Processing");
  if (/mobile|ios|android/.test(text)) dimensions.push("Mobile");
  const complexity = (dimensions.length + modules.length > 10 || form.features.length > 500) ? "Élevée" : dimensions.length > 4 ? "Moyenne" : "Faible";
  const duration = complexity === "Élevée" ? "12–16 semaines" : complexity === "Moyenne" ? "8–12 semaines" : "4–8 semaines";
  const team = complexity === "Élevée" ? "8–12 personnes" : complexity === "Moyenne" ? "5–8 personnes" : "3–5 personnes";
  const recommendations = [
    "Définir les rôles et permissions avant le développement.",
    "Prévoir une stratégie PostgreSQL, migrations et sauvegardes.",
    "Ajouter des critères d’acceptation Given / When / Then.",
    "Prévoir gestion des erreurs, retry et observabilité.",
    dimensions.includes("Paiement") ? "Définir les webhooks de paiement et les états d’abonnement." : "Prévoir authentification, autorisation et audit.",
  ];
  const score = Math.min(99, 72 + Math.min(18, Math.floor((form.features.length + form.problem.length + form.audience.length) / 100)) + Math.min(10, dimensions.length));
  return { dimensions: [...new Set(dimensions)], modules, complexity, duration, team, score, recommendations };
}

function generatePRD(form: any, selected: string[], analysis: any) {
  const sections = [
    ["executive-summary", "Résumé exécutif", `Le projet ${form.name} répond au problème suivant : ${form.problem} Cible principale : ${form.audience}.`],
    ["vision", "Vision et objectifs", `Vision : transformer le besoin identifié en produit fiable, mesurable et évolutif. Objectifs : résoudre le problème utilisateur, accélérer la valeur MVP et préparer l'évolution future.`],
    ["personas", "Public cible et personas", `Public cible : ${form.audience}. Le PRD doit distinguer les utilisateurs finaux, administrateurs, contributeurs et lecteurs selon les permissions nécessaires.`],
    ["use-cases", "Cas d'utilisation", `Les parcours prioritaires couvrent la découverte, l'utilisation de la fonctionnalité principale, la gestion du compte, les erreurs, l'administration et le suivi des résultats.`],
    ["features", "Fonctionnalités clés", `Fonctionnalités déclarées : ${form.features}. Le moteur complète les exigences fonctionnelles manquantes et hiérarchise les fonctionnalités par priorité MVP.`],
    ["requirements", "Exigences fonctionnelles", `Chaque fonctionnalité doit être décrite par son comportement attendu, ses états, ses dépendances, ses règles métier et ses critères d'acceptation.`],
    ["non-functional", "Exigences non fonctionnelles", `Le produit doit viser disponibilité, performance, sécurité, accessibilité, maintenabilité, observabilité et scalabilité adaptées à son niveau de criticité.`],
    ["architecture", "Architecture technique", `Architecture recommandée : Next.js / React côté interface, API modulaire côté serveur, PostgreSQL sur Neon, services isolés par domaine et traitements asynchrones pour les opérations longues.`],
    ["data", "Modèle de données", `PostgreSQL doit centraliser projets, documents, versions, analyses, modèles, utilisateurs et journaux. Les relations et index doivent être conçus pour la recherche et le versioning.`],
    ["security", "Sécurité et conformité", `Authentification, RBAC, isolation des organisations, secrets protégés, validation des entrées, rate limiting, audit logs et sauvegardes sont obligatoires.`],
    ["api", "API et intégrations", `Les APIs doivent être versionnées, documentées OpenAPI, authentifiées et protégées par quotas. Les intégrations externes doivent être encapsulées derrière des services dédiés.`],
    ["qa", "QA et critères d'acceptation", `Tests unitaires, intégration et E2E. Les scénarios critiques utilisent Given / When / Then et couvrent succès, erreur, retry, permissions et données invalides.`],
    ["risks", "Risques et mitigations", `Risques : dérive fonctionnelle, dépendance IA, coûts, sécurité, qualité des données et complexité. Mitigations : versioning, quality gates, quotas, observabilité et revues humaines.`],
    ["roadmap", "Roadmap et backlog", `MVP : formulaire, templates, analyse, génération, édition, versioning et export. V1 : collaboration, billing, API et analytics. V2 : PRD vers architecture, schéma DB, API et tests.`],
    ["dod", "Definition of Done", `Une fonctionnalité est terminée lorsqu'elle est développée, testée, documentée, sécurisée, responsive, validée en staging et prête pour production.`],
  ].map(([id, title, content]) => ({ id, title, content }));
  return { title: form.name, version: "1.0", qualityScore: analysis?.score ?? 90, templates: selected, sections };
}

async function saveToNeon(form: any, selected: string[], analysis: any, prd: any) {
  if (!process.env.DATABASE_URL) return null;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2, ssl: { rejectUnauthorized: false } });
  try {
    const project = await pool.query(`INSERT INTO prd_projects (name,description,problem,target_audience,key_features,constraints_text,additional_details,primary_template,secondary_templates,status) VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9::jsonb,'draft') RETURNING id`, [form.name, form.description || null, form.problem, form.audience, JSON.stringify(form.features.split(/[,\n]/).map((x: string) => x.trim()).filter(Boolean)), form.constraints || null, form.details || null, selected[0] || "web", JSON.stringify(selected.slice(1))]);
    const projectId = project.rows[0].id;
    await pool.query(`INSERT INTO prd_analyses (project_id,dimensions,modules,recommendations,complexity,mvp_duration,team_size,quality_score) VALUES ($1,$2::jsonb,$3::jsonb,$4::jsonb,$5,$6,$7,$8)`, [projectId, JSON.stringify(analysis.dimensions), JSON.stringify(analysis.modules), JSON.stringify(analysis.recommendations), analysis.complexity, analysis.duration, analysis.team, analysis.score]);
    await pool.query(`INSERT INTO prd_documents (project_id,version,status,quality_score,content) VALUES ($1,'1.0','approved',$2,$3::jsonb)`, [projectId, prd.qualityScore, JSON.stringify(prd)]);
    return projectId;
  } finally { await pool.end(); }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.form?.name) return NextResponse.json({ error: "Le nom du projet est requis." }, { status: 400 });
    const analysis = body.action === "analyze" || !body.analysis ? analyzeProject(body.form, body.templates || []) : body.analysis;
    if (body.action === "analyze") return NextResponse.json({ analysis });
    const prd = generatePRD(body.form, body.templates || [], analysis);
    let savedId = null;
    try { savedId = await saveToNeon(body.form, body.templates || [], analysis, prd); } catch (e) { console.error("Neon persistence error", e); }
    return NextResponse.json({ prd, savedId });
  } catch (error: any) { return NextResponse.json({ error: error?.message || "Erreur interne" }, { status: 500 }); }
}

export async function GET() {
  return NextResponse.json({ templates: Object.entries(templates).map(([slug, t]) => ({ slug, ...t })) });
}
