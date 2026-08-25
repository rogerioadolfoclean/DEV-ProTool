import Link from "next/link";
import { exigerSession } from "@/lib/auth";
import { pool } from "@/lib/db";
import { creerCampagne, modifierCampagne, changerStatutCampagne } from "./actions";

export const dynamic = "force-dynamic";

const ensureCampagnes = async () => {
  await pool.query(`CREATE TABLE IF NOT EXISTS campagnes (id SERIAL PRIMARY KEY, tenant_id INT NOT NULL REFERENCES tenants(id), nom VARCHAR(160) NOT NULL, canal VARCHAR(20) NOT NULL CHECK (canal IN ('sms','whatsapp','email','voix','multicanal')), categorie VARCHAR(20) NOT NULL DEFAULT 'marketing' CHECK (categorie IN ('transactionnel','marketing')), statut VARCHAR(20) NOT NULL DEFAULT 'brouillon' CHECK (statut IN ('brouillon','planifiee','en_cours','terminee','annulee')), contenu TEXT NOT NULL DEFAULT '', cible_filtre JSONB NOT NULL DEFAULT '{}', planifiee_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()); CREATE INDEX IF NOT EXISTS idx_campagnes_tenant_date ON campagnes(tenant_id, created_at DESC);`);
};

type Campagne = { id: number; nom: string; canal: string; categorie: string; statut: string; contenu: string; planifiee_at: string | null; created_at: string };
const CHAMP = "rounded-lg bg-[#050b18] border border-[#1c2a4a] px-3 py-2 text-white";

export default async function CampagnesPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const session = await exigerSession();
  const editId = Number((await searchParams).edit) || 0;

  let rows: Campagne[] = [];
  let enEdition: Campagne | null = null;
  let dbError = "";
  try {
    await ensureCampagnes();
    const result = await pool.query(`SELECT id,nom,canal,categorie,statut,contenu,planifiee_at,created_at FROM campagnes WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 100`, [session.tenantId]);
    rows = result.rows as Campagne[];
    if (editId) enEdition = rows.find((r) => r.id === editId) ?? null;
  } catch (error) {
    console.error("campagnes page database error", error);
    dbError = "Impossible d’initialiser ou de joindre PostgreSQL. Vérifiez DATABASE_URL dans Vercel.";
  }

  const planifDefaut = enEdition?.planifiee_at ? new Date(enEdition.planifiee_at).toISOString().slice(0, 16) : "";

  return <section className="space-y-6">
    <div><div className="text-xs font-mono text-amber-400">GESTION COMMERCIALE</div><h1 className="text-3xl font-bold text-white">Campagnes</h1><p className="text-slate-400">Création, planification, suivi et historique des campagnes omnicanales.</p></div>
    {dbError && <div className="rounded-xl border border-amber-700 bg-amber-950/40 p-4"><div className="font-bold text-amber-300">⚠️ Base de données</div><p className="mt-1 text-sm text-amber-100">{dbError}</p></div>}

    <form action={enEdition ? modifierCampagne : creerCampagne} className="grid gap-3 rounded-xl border border-[#1c2a4a] bg-[#080e1f] p-4 md:grid-cols-2">
      <div className="md:col-span-2 flex items-center gap-2">
        <span className={`text-sm font-semibold ${enEdition ? "text-amber-300" : "text-sky-300"}`}>{enEdition ? `✏️ Modifier la campagne #${enEdition.id}` : "➕ Nouvelle campagne"}</span>
        {enEdition && <Link href="/console/campagnes" className="text-xs text-slate-400 underline">Annuler</Link>}
      </div>
      {enEdition && <input type="hidden" name="id" value={enEdition.id} />}
      <input name="nom" required placeholder="Nom de la campagne" defaultValue={enEdition?.nom ?? ""} className={CHAMP} />
      <select name="canal" defaultValue={enEdition?.canal ?? "sms"} className={CHAMP}><option value="sms">SMS</option><option value="whatsapp">WhatsApp</option><option value="email">E-mail</option><option value="voix">Voix</option><option value="multicanal">Multicanal</option></select>
      <select name="categorie" defaultValue={enEdition?.categorie ?? "marketing"} className={CHAMP}><option value="marketing">Marketing</option><option value="transactionnel">Transactionnel</option></select>
      <input name="planifiee_at" type="datetime-local" defaultValue={planifDefaut} className={CHAMP} />
      <textarea name="contenu" required placeholder="Contenu de la campagne" defaultValue={enEdition?.contenu ?? ""} className="md:col-span-2 min-h-28 rounded-lg bg-[#050b18] border border-[#1c2a4a] px-3 py-2 text-white" />
      <button className={`md:col-span-2 rounded-lg px-4 py-2 font-semibold text-white ${enEdition ? "bg-amber-600 hover:bg-amber-500" : "bg-sky-600 hover:bg-sky-500"}`}>{enEdition ? "Enregistrer les modifications" : "Créer la campagne"}</button>
    </form>

    <div className="overflow-x-auto rounded-xl border border-[#1c2a4a] bg-[#080e1f]"><table className="w-full text-sm"><thead className="bg-[#0b1428] text-slate-400"><tr><th className="px-4 py-3 text-left">Nom</th><th className="px-4 py-3 text-left">Canal</th><th className="px-4 py-3 text-left">Catégorie</th><th className="px-4 py-3 text-left">Statut</th><th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Actions</th></tr></thead><tbody className="divide-y divide-[#1c2a4a]">{rows.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Aucune campagne enregistrée.</td></tr> : rows.map((r) => <tr key={r.id} className={enEdition?.id === r.id ? "bg-amber-500/5" : ""}><td className="px-4 py-3 text-white">{r.nom}</td><td className="px-4 py-3 text-sky-300">{r.canal}</td><td className="px-4 py-3 text-slate-300">{r.categorie}</td><td className="px-4 py-3 text-amber-300">{r.statut}</td><td className="px-4 py-3 text-slate-400">{new Date(r.created_at).toLocaleString("fr-FR")}</td><td className="px-4 py-3"><div className="flex items-center gap-2"><Link href={`/console/campagnes?edit=${r.id}`} className="rounded bg-amber-600/80 hover:bg-amber-500 px-2 py-1 text-xs text-white">Modifier</Link><form action={changerStatutCampagne} className="flex gap-1"><input type="hidden" name="id" value={r.id} /><select name="statut" defaultValue={r.statut} className="rounded bg-[#050b18] border border-[#1c2a4a] px-2 py-1 text-white"><option value="brouillon">Brouillon</option><option value="planifiee">Planifiée</option><option value="en_cours">En cours</option><option value="terminee">Terminée</option><option value="annulee">Annulée</option></select><button className="rounded bg-slate-700 px-2 py-1 text-white">OK</button></form></div></td></tr>)}</tbody></table></div>
  </section>;
}
