import Link from "next/link";
import { redirect } from "next/navigation";
import { exigerSession, exigerEcriture, audit } from "@/lib/auth";
import { pool } from "@/lib/db";

async function create(formData: FormData) {
  "use server";
  const s = await exigerEcriture();
  const titre = String(formData.get("titre") || "").trim();
  const debut = String(formData.get("debut") || "");
  const fin = String(formData.get("fin") || "");
  if (!titre || !debut || !fin) return;
  const r = await pool.query(
    `INSERT INTO rendez_vous(tenant_id,titre,description,debut,fin,lieu,notes) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    [s.tenantId, titre, String(formData.get("description") || ""), debut, fin, String(formData.get("lieu") || ""), String(formData.get("notes") || "")],
  );
  await audit("creation_rendez_vous", String(r.rows[0].id), titre);
}

async function modifier(formData: FormData) {
  "use server";
  const s = await exigerEcriture();
  const id = Number(formData.get("id"));
  const titre = String(formData.get("titre") || "").trim();
  const debut = String(formData.get("debut") || "");
  const fin = String(formData.get("fin") || "");
  if (!id || !titre || !debut || !fin) return;
  const r = await pool.query(
    `UPDATE rendez_vous SET titre=$1,description=$2,debut=$3,fin=$4,lieu=$5,notes=$6,updated_at=NOW() WHERE id=$7 AND tenant_id=$8 RETURNING id`,
    [titre, String(formData.get("description") || ""), debut, fin, String(formData.get("lieu") || ""), String(formData.get("notes") || ""), id, s.tenantId],
  );
  if (!r.rowCount) throw new Error("Rendez-vous introuvable");
  await audit("modification_rendez_vous", String(id), titre);
  redirect("/console/rendez-vous");
}

async function cancel(formData: FormData) {
  "use server";
  const s = await exigerEcriture();
  const id = Number(formData.get("id"));
  await pool.query(`UPDATE rendez_vous SET statut='annule',updated_at=NOW() WHERE id=$1 AND tenant_id=$2`, [id, s.tenantId]);
  await audit("annulation_rendez_vous", String(id), null);
}

type Rdv = { id: number; titre: string; description: string | null; debut: string; fin: string; statut: string; lieu: string | null; notes: string | null };
const local = (d: string) => new Date(d).toISOString().slice(0, 16);
const CH = "rounded-lg bg-slate-950 border border-slate-700 p-3";

export default async function RendezVousPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const s = await exigerSession();
  const editId = Number((await searchParams).edit) || 0;
  const r = await pool.query(`SELECT id,titre,description,debut,fin,statut,lieu,notes FROM rendez_vous WHERE tenant_id=$1 ORDER BY debut ASC LIMIT 100`, [s.tenantId]);
  const rows = r.rows as Rdv[];
  const enEdition = editId ? rows.find((x) => x.id === editId) ?? null : null;

  return <section className="space-y-5">
    <div><div className="text-xs font-mono text-sky-400">AGENDA COMMERCIAL</div><h1 className="text-3xl font-bold">📅 Rendez-vous</h1><p className="text-slate-400">Planification, suivi et préparation IA des rendez-vous clients.</p></div>

    <form action={enEdition ? modifier : create} className="grid gap-3 rounded-xl border border-slate-700 bg-slate-900 p-5 md:grid-cols-2">
      <div className="md:col-span-2 flex items-center gap-2"><span className={`text-sm font-semibold ${enEdition ? "text-amber-300" : "text-sky-300"}`}>{enEdition ? `✏️ Modifier le rendez-vous #${enEdition.id}` : "➕ Nouveau rendez-vous"}</span>{enEdition && <Link href="/console/rendez-vous" className="text-xs text-slate-400 underline">Annuler</Link>}</div>
      {enEdition && <input type="hidden" name="id" value={enEdition.id} />}
      <input name="titre" required placeholder="Titre du rendez-vous" defaultValue={enEdition?.titre ?? ""} className={CH} />
      <input name="lieu" placeholder="Lieu / visio" defaultValue={enEdition?.lieu ?? ""} className={CH} />
      <input name="debut" required type="datetime-local" defaultValue={enEdition ? local(enEdition.debut) : ""} className={CH} />
      <input name="fin" required type="datetime-local" defaultValue={enEdition ? local(enEdition.fin) : ""} className={CH} />
      <textarea name="description" placeholder="Objectif / contexte client" defaultValue={enEdition?.description ?? ""} className={`${CH} md:col-span-2`} />
      <textarea name="notes" placeholder="Notes" defaultValue={enEdition?.notes ?? ""} className={`${CH} md:col-span-2`} />
      <button className={`rounded-lg px-4 py-3 font-bold md:col-span-2 text-white ${enEdition ? "bg-amber-600 hover:bg-amber-500" : "bg-sky-600 hover:bg-sky-500"}`}>{enEdition ? "Enregistrer les modifications" : "Créer le rendez-vous"}</button>
    </form>

    <div className="grid gap-3">{rows.map((x) => <article key={x.id} className={`rounded-xl border border-slate-700 bg-slate-900 p-4 flex flex-col md:flex-row md:items-center gap-4 ${enEdition?.id === x.id ? "ring-1 ring-amber-500/50" : ""}`}><div className="flex-1"><h2 className="font-bold text-lg">{x.titre}</h2><p className="text-sm text-slate-400">{new Date(x.debut).toLocaleString("fr-FR")} → {new Date(x.fin).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p><p className="text-sm text-slate-500">{x.lieu || "Lieu non défini"} · {x.statut}</p><p className="text-sm text-slate-400 mt-2">{x.description || ""}</p></div><div className="flex flex-wrap gap-2"><Link href={`/console/rendez-vous?edit=${x.id}`} className="rounded-lg bg-amber-600/80 hover:bg-amber-500 px-3 py-2 text-white">✏️ Modifier</Link><a href={`/console/ia-commercial?rdv=${x.id}`} className="rounded-lg bg-violet-600 px-3 py-2">🤖 Préparer avec IA</a>{x.statut !== "annule" && <form action={cancel}><input type="hidden" name="id" value={x.id} /><button className="rounded-lg bg-rose-700 px-3 py-2">Annuler</button></form>}</div></article>)}</div>
  </section>;
}
