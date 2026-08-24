import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { generateAiText, normalizeAiProvider } from "@/lib/ai-provider";
import { exigerSession, audit } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Execute une requete et renvoie ses lignes, ou [] si elle echoue
// (les modules de donnees restent independants: une table vide/absente
//  ne casse pas la consultation).
async function safe(sql: string): Promise<Record<string, unknown>[]> {
  try {
    const r = await pool.query(sql);
    return r.rows;
  } catch {
    return [];
  }
}

function bloc(titre: string, lignes: string[]): string {
  if (!lignes.length) return "";
  return `\n## ${titre}\n${lignes.join("\n")}`;
}

export async function POST(req: Request) {
  try {
    await exigerSession();
    const body = await req.json();
    const question = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (!question) return NextResponse.json({ error: "prompt_required" }, { status: 422 });
    const provider = normalizeAiProvider(body.provider);

    const [clients, canaux, voix, campagnes, dest, fraude, facturation] = await Promise.all([
      safe(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE status='active')::int actifs,
              COUNT(*) FILTER (WHERE status='blocked')::int bloques FROM clients`),
      safe(`SELECT canal, COUNT(*)::int n,
              ROUND(COUNT(*) FILTER (WHERE statut='livre')*100.0/NULLIF(COUNT(*),0),1) taux,
              ROUND(COALESCE(SUM(cout),0)::numeric,2) cout FROM messages GROUP BY canal ORDER BY n DESC`),
      safe(`SELECT COUNT(*)::int n, ROUND(AVG(mos_score)::numeric,2) mos FROM appels WHERE mos_score IS NOT NULL`),
      safe(`SELECT statut, COUNT(*)::int n FROM campagnes GROUP BY statut ORDER BY n DESC`),
      safe(`SELECT COALESCE(pays_destination,'Autres') pays, COUNT(*)::int n,
              ROUND(COALESCE(SUM(cout),0)::numeric,2) cout FROM cdrs GROUP BY 1 ORDER BY cout DESC LIMIT 6`),
      safe(`SELECT gravite, COUNT(*)::int n FROM alertes_fraude
              WHERE COALESCE(statut,'ouverte') NOT IN ('resolue','close','fermee') GROUP BY gravite ORDER BY n DESC`),
      safe(`SELECT COALESCE(devise,'USD') devise, ROUND(COALESCE(SUM(montant),0)::numeric,2) total,
              COUNT(*)::int n FROM factures GROUP BY devise`),
    ]);

    const cl = clients[0] as { total?: number; actifs?: number; bloques?: number } | undefined;
    const vx = voix[0] as { n?: number; mos?: string } | undefined;

    const contexte = [
      bloc("Clients (CRM)", cl ? [`Total: ${cl.total} · Actifs: ${cl.actifs} · Bloqués: ${cl.bloques}`] : []),
      bloc("Messagerie par canal", canaux.map((c) => `${c.canal}: ${c.n} messages, ${c.taux ?? 0}% livrés, coût ${c.cout ?? 0} $`)),
      bloc("Qualité voix", vx && vx.n ? [`${vx.n} appels notés · MOS moyen ${vx.mos}/5`] : []),
      bloc("Campagnes", campagnes.map((c) => `${c.statut}: ${c.n}`)),
      bloc("Coût par destination (CDR)", dest.map((d) => `${d.pays}: ${d.n} appels, ${d.cout} $`)),
      bloc("Alertes de fraude ouvertes", fraude.map((f) => `${f.gravite}: ${f.n}`)),
      bloc("Facturation cumulée", facturation.map((f) => `${f.total} ${f.devise} sur ${f.n} facture(s)`)),
    ].filter(Boolean).join("\n");

    const system =
      "Tu es le consultant commercial et analyste IA d'OmniComm 360°. " +
      "On te fournit un INSTANTANÉ DE DONNÉES RÉELLES de la plateforme. " +
      "Base ton analyse UNIQUEMENT sur ces chiffres réels : ne les contredis pas et n'invente aucune donnée absente. " +
      "Si une information nécessaire manque dans l'instantané, dis-le explicitement au lieu de la deviner. " +
      "Structure : 1) Lecture des chiffres clés, 2) Risques et opportunités, 3) Recommandations concrètes et priorisées, 4) Prochaine étape.";

    const prompt =
      `INSTANTANÉ DE DONNÉES RÉELLES OMNICOMM 360° (au ${new Date().toLocaleString("fr-FR")})\n${contexte || "\n(Aucune donnée disponible pour le moment.)"}\n\n` +
      `DEMANDE DE L'UTILISATEUR :\n${question}`;

    const result = await generateAiText({ provider, system, prompt });
    await audit("consultation_ia_donnees", provider, `Q: ${question.slice(0, 120)}`).catch(() => {});
    return NextResponse.json({ text: result.text, model: result.model, provider: result.provider, contexte });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ai_consult_error" },
      { status: 502 },
    );
  }
}
