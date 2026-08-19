import { pool } from "@/lib/db";
import { Carte, CarteStat, EnTetePage } from "@/components/ui";
import AiProviderSwitch from "@/components/ai-provider-switch";

export const dynamic = "force-dynamic";

export default async function PageIa() {
  const [agents, convs, stats] = await Promise.all([
    pool.query(`SELECT a.*, t.nom AS tenant FROM agents_ia a JOIN tenants t ON t.id = a.tenant_id ORDER BY a.id`),
    pool.query(`SELECT c.*, a.nom AS agent FROM conversations_ia c JOIN agents_ia a ON a.id = c.agent_id ORDER BY c.created_at DESC LIMIT 10`),
    pool.query(`SELECT COUNT(*) AS n, COALESCE(ROUND(AVG(satisfaction),1),0) AS sat, COALESCE(SUM(duree_secondes),0) AS duree FROM conversations_ia`),
  ]);
  const s = stats.rows[0];

  return (
    <div>
      <EnTetePage
        rf="RF-008"
        titre="IA Conversationnelle (TTS/STT + LLM)"
        sousTitre="Synthèse vocale, reconnaissance vocale et LLM pour la voix intelligente et l'automatisation (RF-008)"
        couleur="violet"
      />

      <AiProviderSwitch />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <CarteStat libelle="Agents IA actifs" valeur={agents.rows.filter((a) => a.actif).length} couleur="violet" />
        <CarteStat libelle="Conversations" valeur={s.n} couleur="sky" />
        <CarteStat libelle="Satisfaction moyenne" valeur={`${s.sat} / 5`} couleur="emerald" />
        <CarteStat libelle="Minutes automatisées" valeur={Math.round(Number(s.duree) / 60)} couleur="amber" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {agents.rows.map((a) => (
          <Carte key={a.id} className="border-violet-500/40">
            <div className="flex items-center gap-2">
              <span className="text-lg">🤖</span>
              <h2 className="font-bold text-white">{a.nom}</h2>
              <span className={`ml-auto text-xs ${a.actif ? "text-emerald-300" : "text-slate-500"}`}>
                {a.actif ? "● en service" : "○ hors service"}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3 text-center">
              <div className="border border-[#1c2a4a] rounded-md py-1.5 bg-[#0a1120]">
                <div className="text-[10px] uppercase text-slate-500">Langue</div>
                <div className="text-xs text-slate-200">{a.langue}</div>
              </div>
              <div className="border border-[#1c2a4a] rounded-md py-1.5 bg-[#0a1120]">
                <div className="text-[10px] uppercase text-slate-500">Voix (TTS)</div>
                <div className="text-xs text-slate-200">{a.voix}</div>
              </div>
              <div className="border border-[#1c2a4a] rounded-md py-1.5 bg-[#0a1120]">
                <div className="text-[10px] uppercase text-slate-500">LLM</div>
                <div className="text-xs text-slate-200">{a.modele_llm}</div>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-3 border border-[#1c2a4a] rounded-md p-2 bg-[#0a1120]">
              <span className="text-slate-500">Prompt système :</span> {a.prompt_systeme}
            </p>
            <div className="text-[11px] text-slate-500 mt-2">Tenant : {a.tenant}</div>
          </Carte>
        ))}
      </div>

      <h2 className="font-bold text-white mb-3">Transcriptions récentes (STT)</h2>
      <div className="space-y-2">
        {convs.rows.map((c) => (
          <Carte key={c.id}>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="text-violet-300 font-semibold">{c.agent}</span>
              <span>· {Math.round(c.duree_secondes / 60)} min</span>
              {c.satisfaction && <span className="text-amber-300">· {"★".repeat(c.satisfaction)}</span>}
              <span className="ml-auto">{new Date(c.created_at).toLocaleString("fr-FR")}</span>
            </div>
            <p className="text-sm text-slate-200 mt-1.5">{c.transcription}</p>
          </Carte>
        ))}
      </div>
    </div>
  );
}
