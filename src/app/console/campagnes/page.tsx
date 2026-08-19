import { exigerSession } from "@/lib/auth";
import { pool } from "@/lib/db";
import { creerCampagne, changerStatutCampagne } from "./actions";

export const dynamic = "force-dynamic";

export default async function CampagnesPage() {
  const session = await exigerSession();
  const { rows } = await pool.query(`SELECT id,nom,canal,categorie,statut,contenu,planifiee_at,created_at FROM campagnes WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 100`, [session.tenantId]);
  return <section className="space-y-6">
    <div><div className="text-xs font-mono text-amber-400">GESTION COMMERCIALE</div><h1 className="text-3xl font-bold text-white">Campagnes</h1><p className="text-slate-400">Création, planification, suivi et historique des campagnes omnicanales.</p></div>
    <form action={creerCampagne} className="grid gap-3 rounded-xl border border-[#1c2a4a] bg-[#080e1f] p-4 md:grid-cols-2">
      <input name="nom" required placeholder="Nom de la campagne" className="rounded-lg bg-[#050b18] border border-[#1c2a4a] px-3 py-2 text-white" />
      <select name="canal" className="rounded-lg bg-[#050b18] border border-[#1c2a4a] px-3 py-2 text-white"><option value="sms">SMS</option><option value="whatsapp">WhatsApp</option><option value="email">E-mail</option><option value="voix">Voix</option><option value="multicanal">Multicanal</option></select>
      <select name="categorie" className="rounded-lg bg-[#050b18] border border-[#1c2a4a] px-3 py-2 text-white"><option value="marketing">Marketing</option><option value="transactionnel">Transactionnel</option></select>
      <input name="planifiee_at" type="datetime-local" className="rounded-lg bg-[#050b18] border border-[#1c2a4a] px-3 py-2 text-white" />
      <textarea name="contenu" required placeholder="Contenu de la campagne" className="md:col-span-2 min-h-28 rounded-lg bg-[#050b18] border border-[#1c2a4a] px-3 py-2 text-white" />
      <button className="md:col-span-2 rounded-lg bg-sky-600 px-4 py-2 font-semibold text-white">Créer la campagne</button>
    </form>
    <div className="overflow-x-auto rounded-xl border border-[#1c2a4a] bg-[#080e1f]"><table className="w-full text-sm"><thead className="bg-[#0b1428] text-slate-400"><tr><th className="px-4 py-3 text-left">Nom</th><th className="px-4 py-3 text-left">Canal</th><th className="px-4 py-3 text-left">Catégorie</th><th className="px-4 py-3 text-left">Statut</th><th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Action</th></tr></thead><tbody className="divide-y divide-[#1c2a4a]">{rows.map((r)=><tr key={r.id}><td className="px-4 py-3 text-white">{r.nom}</td><td className="px-4 py-3 text-sky-300">{r.canal}</td><td className="px-4 py-3 text-slate-300">{r.categorie}</td><td className="px-4 py-3 text-amber-300">{r.statut}</td><td className="px-4 py-3 text-slate-400">{new Date(r.created_at).toLocaleString("fr-FR")}</td><td className="px-4 py-3"><form action={changerStatutCampagne} className="flex gap-2"><input type="hidden" name="id" value={r.id}/><select name="statut" defaultValue={r.statut} className="rounded bg-[#050b18] border border-[#1c2a4a] px-2 py-1 text-white"><option value="brouillon">Brouillon</option><option value="planifiee">Planifiée</option><option value="en_cours">En cours</option><option value="terminee">Terminée</option><option value="annulee">Annulée</option></select><button className="rounded bg-slate-700 px-2 py-1 text-white">OK</button></form></td></tr>)}</tbody></table></div>
  </section>;
}
