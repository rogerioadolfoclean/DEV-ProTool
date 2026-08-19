import { pool } from "@/lib/db";
import { exigerSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Row = {
  id: number;
  utilisateur_email: string;
  utilisateur_nom: string;
  role: string;
  action: string;
  cible: string | null;
  details: string | null;
  adresse_ip: string | null;
  created_at: Date;
};

function esc(value: string | null) {
  return value ?? "—";
}

export default async function HistoriquePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; module?: string; jour?: string }>;
}) {
  const session = await exigerSession();
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const module = (params.module ?? "").trim();
  const jour = (params.jour ?? "").trim();

  const values: string[] = [String(session.tenantId)];
  const conditions = ["u.tenant_id = $1"];

  if (q) {
    values.push(`%${q}%`);
    conditions.push(`(a.action ILIKE $${values.length} OR COALESCE(a.cible,'') ILIKE $${values.length} OR COALESCE(a.details,'') ILIKE $${values.length} OR a.utilisateur_email ILIKE $${values.length})`);
  }
  if (module) {
    values.push(`${module}%`);
    conditions.push(`a.action ILIKE $${values.length}`);
  }
  if (jour) {
    values.push(jour);
    conditions.push(`a.created_at >= $${values.length}::date AND a.created_at < ($${values.length}::date + INTERVAL '1 day')`);
  }

  const result = await pool.query<Row>(
    `SELECT a.id, a.utilisateur_email, a.utilisateur_nom, a.role, a.action, a.cible, a.details, a.adresse_ip, a.created_at
     FROM audit_log a
     LEFT JOIN utilisateurs u ON u.email = a.utilisateur_email
     WHERE ${conditions.join(" AND ")}
     ORDER BY a.created_at DESC
     LIMIT 500`,
    values
  );

  const rows = result.rows;
  const formatter = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "UTC",
  });

  return (
    <section className="space-y-5">
      <div>
        <div className="text-xs font-mono text-sky-400">AUDIT-UNIVERSEL</div>
        <h1 className="text-2xl md:text-3xl font-bold text-white mt-1">Historique universel</h1>
        <p className="text-sm text-slate-400 mt-1">Jour · date · heure exacte · utilisateur · module · événement · détails</p>
      </div>

      <form className="grid grid-cols-1 md:grid-cols-4 gap-3 rounded-xl border border-[#1c2a4a] bg-[#080e1f] p-4" method="get">
        <input name="q" defaultValue={q} placeholder="Rechercher une action, cible…" className="rounded-lg bg-[#050b18] border border-[#1c2a4a] px-3 py-2 text-sm text-white outline-none focus:border-sky-500" />
        <input name="module" defaultValue={module} placeholder="Module / préfixe" className="rounded-lg bg-[#050b18] border border-[#1c2a4a] px-3 py-2 text-sm text-white outline-none focus:border-sky-500" />
        <input name="jour" defaultValue={jour} type="date" className="rounded-lg bg-[#050b18] border border-[#1c2a4a] px-3 py-2 text-sm text-white outline-none focus:border-sky-500" />
        <button className="rounded-lg bg-sky-600 hover:bg-sky-500 px-4 py-2 text-sm font-semibold text-white">Rechercher</button>
      </form>

      <div className="rounded-xl border border-[#1c2a4a] bg-[#080e1f] overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#0b1428] text-slate-400 text-left">
            <tr>
              <th className="px-4 py-3">Jour / date / heure (UTC)</th>
              <th className="px-4 py-3">Utilisateur</th>
              <th className="px-4 py-3">Module / événement</th>
              <th className="px-4 py-3">Cible</th>
              <th className="px-4 py-3">Détails</th>
              <th className="px-4 py-3">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1c2a4a]">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-sky-500/5 align-top">
                <td className="px-4 py-3 whitespace-nowrap text-slate-200">{formatter.format(new Date(row.created_at))}</td>
                <td className="px-4 py-3"><div className="text-white">{row.utilisateur_nom}</div><div className="text-xs text-slate-500">{row.utilisateur_email} · {row.role}</div></td>
                <td className="px-4 py-3"><span className="font-mono text-sky-300">{row.action}</span></td>
                <td className="px-4 py-3 text-slate-300">{esc(row.cible)}</td>
                <td className="px-4 py-3 text-slate-400 max-w-xl">{esc(row.details)}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{esc(row.adresse_ip)}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Aucun événement trouvé.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-slate-500">{rows.length} événement(s) affiché(s) · session tenant {session.tenantId} · horodatage PostgreSQL.</div>
    </section>
  );
}
