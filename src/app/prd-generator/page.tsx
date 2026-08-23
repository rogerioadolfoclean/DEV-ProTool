"use client";

import { useMemo, useState } from "react";
import "./prd-generator.css";

type Template = { slug: string; name: string; category: string; description: string; icon: string };
type Analysis = { dimensions: string[]; modules: string[]; complexity: string; duration: string; team: string; score: number; recommendations: string[] };

type FormState = {
  name: string; description: string; problem: string; audience: string; features: string; constraints: string; details: string;
};

const templates: Template[] = [
  { slug: "music-ai", name: "Musique IA", category: "IA / Média", description: "Génération musicale professionnelle par IA", icon: "♫" },
  { slug: "ai-ml", name: "IA & Machine Learning", category: "IA", description: "Produit IA, ML, chatbot ou recommandation", icon: "✦" },
  { slug: "api-platform", name: "API Platform", category: "API", description: "API publique REST/GraphQL sécurisée", icon: "↗" },
  { slug: "saas-cloud", name: "SaaS / Cloud", category: "Cloud", description: "Plateforme SaaS multi-tenant", icon: "☁" },
  { slug: "payments", name: "Paiement & Abonnement", category: "Fintech", description: "Crédits, facturation et abonnements", icon: "¤" },
  { slug: "streaming-media", name: "Streaming & Média", category: "Média", description: "Audio, vidéo, podcast et distribution", icon: "▶" },
  { slug: "web", name: "Application Web", category: "Web", description: "SaaS, portail ou outil responsive", icon: "▣" },
];

const defaultForm: FormState = {
  name: "", description: "", problem: "", audience: "", features: "", constraints: "", details: "",
};

export default function PRDGeneratorPage() {
  const [form, setForm] = useState<FormState>(defaultForm);
  const [selected, setSelected] = useState<string[]>(["web"]);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [prd, setPrd] = useState<any>(null);
  const [message, setMessage] = useState("");

  const featureChips = useMemo(() => form.features.split(/[,\n]/).map(s => s.trim()).filter(Boolean).slice(0, 12), [form.features]);
  const update = (key: keyof FormState, value: string) => setForm(v => ({ ...v, [key]: value }));

  async function analyze() {
    if (!form.name.trim() || !form.problem.trim() || !form.audience.trim() || !form.features.trim()) {
      setMessage("Complétez les 4 champs obligatoires avant l'analyse."); return;
    }
    setLoading(true); setMessage("");
    try {
      const res = await fetch("/api/prd", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "analyze", form, templates: selected }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analyse impossible");
      setAnalysis(data.analysis); setStep(2);
    } catch (e: any) { setMessage(e.message); } finally { setLoading(false); }
  }

  async function generate() {
    setLoading(true); setMessage("");
    try {
      const res = await fetch("/api/prd", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "generate", form, templates: selected, analysis }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Génération impossible");
      setPrd(data.prd); setStep(3);
    } catch (e: any) { setMessage(e.message); } finally { setLoading(false); }
  }

  return <main className="prd-shell">
    <aside className="prd-sidebar">
      <div className="prd-brand"><div className="prd-logo">P</div><div><strong>PRD</strong><span>Generator Pro</span></div></div>
      <nav>
        {["✦  Nouveau PRD", "▤  Mes PRD", "▦  Modèles", "▣  Bibliothèque", "◫  Versions", "♙  Équipe", "⚙  Paramètres", "↗  API & Intégrations", "?  Aide & Support"].map((item, i) => <button key={item} className={i === 0 ? "active" : ""}>{item}</button>)}
      </nav>
      <div className="sidebar-bottom"><div className="pro-card">♛ <strong>Upgrade Pro</strong><small>Fonctionnalités avancées</small></div><div className="user-card"><span>R</span><div><strong>Rogerio Team</strong><small>Administrateur</small></div></div></div>
    </aside>

    <section className="prd-content">
      <header className="prd-header"><div><h1>Créer un nouveau PRD</h1><p>Transformez une idée en spécification produit professionnelle et prête à développer.</p></div><div className="steps"><span className={step >= 1 ? "current" : ""}>1 <b>Informations</b></span><i>—</i><span className={step >= 2 ? "current" : ""}>2 <b>Analyse IA</b></span><i>—</i><span className={step >= 3 ? "current" : ""}>3 <b>Génération PRD</b></span></div></header>

      {message && <div className="alert">⚠ {message}</div>}

      <div className="prd-grid">
        <section className="form-card">
          <div className="card-title"><div><h2>Informations essentielles</h2><p>Décrivez votre projet. Le moteur complète automatiquement les exigences manquantes.</p></div><span className="required">* Champs obligatoires</span></div>
          <Field label="Nom du projet / fonctionnalité *" value={form.name} onChange={v => update("name", v)} placeholder="Ex. DEVARYX Music AI Studio" />
          <Field label="Description du projet" value={form.description} onChange={v => update("description", v)} textarea placeholder="Décrivez brièvement le produit et sa vision." />
          <Field label="Problème à résoudre *" value={form.problem} onChange={v => update("problem", v)} textarea placeholder="Quel problème concret le produit doit-il résoudre ?" />
          <Field label="Public cible *" value={form.audience} onChange={v => update("audience", v)} textarea placeholder="Utilisateurs, entreprises, équipes, développeurs..." />
          <Field label="Fonctionnalités clés *" value={form.features} onChange={v => update("features", v)} textarea placeholder="Séparez les fonctionnalités par virgules ou lignes." />
          {featureChips.length > 0 && <div className="chips">{featureChips.map(c => <span key={c}>{c}</span>)}</div>}
          <Field label="Contraintes techniques / métier" value={form.constraints} onChange={v => update("constraints", v)} textarea placeholder="Stack, PostgreSQL, sécurité, réglementation, APIs, performance..." />
          <Field label="Détails additionnels" value={form.details} onChange={v => update("details", v)} textarea placeholder="Contexte supplémentaire que l'IA doit prendre en compte." />
          <button className="primary" onClick={analyze} disabled={loading}>{loading && step === 1 ? "Analyse en cours…" : "✦  Analyser le projet avec l'IA"}</button>
        </section>

        <section className="right-stack">
          <div className="templates-card">
            <div className="card-title"><div><h2>Choisissez un modèle</h2><p>Vous pouvez combiner plusieurs modèles spécialisés.</p></div><span className="ai-badge">✦ Recommandations IA</span></div>
            <div className="template-grid">{templates.map(t => <button key={t.slug} onClick={() => setSelected(s => s.includes(t.slug) ? s.filter(x => x !== t.slug) : [...s, t.slug])} className={`template ${selected.includes(t.slug) ? "selected" : ""}`}><div className="template-icon">{t.icon}</div><div><strong>{t.name}</strong><small>{t.description}</small></div><span className="check">{selected.includes(t.slug) ? "✓" : ""}</span></button>)}</div>
            <div className="all-models">Voir tous les modèles (100+)</div>
          </div>

          <div className="analysis-card">
            <div className="card-title"><div><h2>Analyse IA du projet</h2><p>{analysis ? "Analyse terminée — recommandations calculées." : "L'analyse apparaît ici après validation des informations."}</p></div><span className={analysis ? "success-badge" : "pending-badge"}>{analysis ? "✓ Analyse terminée" : "○ En attente"}</span></div>
            {analysis ? <><div className="dimension-row">{analysis.dimensions.map(d => <span key={d}>{d}</span>)}</div><div className="metrics"><Metric title="Complexité estimée" value={analysis.complexity} danger={analysis.complexity === "Élevée"}/><Metric title="Durée estimée MVP" value={analysis.duration}/><Metric title="Équipe recommandée" value={analysis.team}/></div><div className="module-list"><strong>Modules détectés</strong><div>{analysis.modules.map(m => <span key={m}>◈ {m}</span>)}</div></div><div className="recommendations"><strong>Gaps et recommandations</strong>{analysis.recommendations.slice(0, 5).map(r => <p key={r}>✓ {r}</p>)}</div><button className="secondary" onClick={() => setStep(1)}>Modifier l'analyse</button></> : <div className="empty-analysis">Remplissez le formulaire puis cliquez sur <b>Analyser le projet avec l'IA</b>.</div>}
          </div>
        </section>
      </div>

      <section className="workflow"><h2>Notre processus en 4 étapes</h2><div className="workflow-grid"><Flow n="1" title="Analyse IA" text="Détection automatique du domaine, des besoins et des contraintes."/><Flow n="2" title="Génération" text="Création des sections, exigences, parcours et critères d'acceptation."/><Flow n="3" title="Revue & Personnalisation" text="Révisez, modifiez et régénérez les parties nécessaires."/><Flow n="4" title="Export & Partage" text="PDF, DOCX, Markdown, JSON et partage avec votre équipe."/></div></section>

      <section className="cta"><div><span>🚀</span><div><h2>PRD professionnel prêt à l'emploi</h2><p>Une spécification structurée, testable et exploitable par votre équipe.</p></div></div><button className="primary" onClick={analysis ? generate : analyze} disabled={loading}>{loading ? "Génération…" : analysis ? "✦ Générer le PRD complet" : "✦ Analyser puis générer"}</button></section>

      {prd && <section className="prd-result"><div className="result-head"><div><span className="success-badge">✓ PRD généré</span><h2>{prd.title}</h2><p>Version {prd.version} · Score qualité {prd.qualityScore}/100 · {prd.sections.length} sections</p></div><button className="secondary" onClick={() => navigator.clipboard.writeText(JSON.stringify(prd, null, 2))}>Copier le PRD JSON</button></div><div className="section-list">{prd.sections.map((s: any, i: number) => <article key={s.id}><span>{String(i + 1).padStart(2, "0")}</span><div><h3>{s.title}</h3><p>{s.content}</p></div></article>)}</div></section>}
    </section>
  </main>;
}

function Field({ label, value, onChange, placeholder, textarea = false }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; textarea?: boolean }) { return <label className="field"><span>{label}</span>{textarea ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3}/> : <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}/>}</label>; }
function Metric({ title, value, danger = false }: { title: string; value: string; danger?: boolean }) { return <div className="metric"><small>{title}</small><strong className={danger ? "danger" : ""}>{value}</strong></div>; }
function Flow({ n, title, text }: { n: string; title: string; text: string }) { return <div className="flow"><b>{n}</b><div><strong>{title}</strong><p>{text}</p></div></div>; }
