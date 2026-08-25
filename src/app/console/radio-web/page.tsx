import Link from "next/link";
import { pool } from "@/lib/db";
import { Carte, CarteStat, EnTetePage, BadgeStatut } from "@/components/ui";
import { creerFlux, modifierFlux, supprimerFlux } from "./actions";
import GenerateurMotPasse from "@/components/generateur-mot-passe";

export const dynamic = "force-dynamic";

const ICONES: Record<string, string> = { radio: "📻", podcast: "🎙", video: "🎬" };
const CH = "rounded-lg bg-[#050b18] border border-[#1c2a4a] px-3 py-2 text-white text-sm w-full";

type Flux = { id: number; tenant: string; nom: string; type: string; protocole: string; url_flux: string; bitrate_kbps: number; auditeurs_actuels: number; auditeurs_pic: number; statut: string; serveur: string | null; port: number | null; mount_point: string | null; username: string | null; mot_passe: string | null; encodage: string | null };

export default async function PageRadio({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const editId = Number((await searchParams).edit) || 0;
  const flux = await pool.query(`SELECT f.*, t.nom AS tenant FROM flux_streaming f JOIN tenants t ON t.id = f.tenant_id ORDER BY f.created_at DESC`);
  const rows = flux.rows as Flux[];
  const enLigne = rows.filter((f) => f.statut === "en_ligne");
  const auditeurs = enLigne.reduce((a, f) => a + f.auditeurs_actuels, 0);
  const e = editId ? rows.find((f) => f.id === editId) ?? null : null;

  return (
    <div>
      <EnTetePage rf="RF-010" titre="Radio Web & Podcast" sousTitre="Créez et diffusez vos flux audio HLS / Icecast (radio, podcast, vidéo) — RF-010" couleur="violet" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <CarteStat libelle="Flux configurés" valeur={rows.length} couleur="violet" />
        <CarteStat libelle="En ligne" valeur={enLigne.length} couleur="emerald" />
        <CarteStat libelle="Auditeurs en direct" valeur={auditeurs} couleur="sky" />
        <CarteStat libelle="Pic d'audience" valeur={Math.max(0, ...rows.map((f) => f.auditeurs_pic))} couleur="amber" />
      </div>

      {/* Formulaire creer / modifier un flux */}
      <Carte>
        <div className="flex items-center gap-2 mb-3">
          <h2 className={`font-bold ${e ? "text-amber-300" : "text-white"}`}>{e ? `✏️ Modifier le flux #${e.id}` : "➕ Créer un flux de streaming"}</h2>
          {e && <Link href="/console/radio-web" className="text-xs text-slate-400 underline">Annuler</Link>}
        </div>
        <form action={e ? modifierFlux : creerFlux} className="grid gap-3 md:grid-cols-3">
          {e && <input type="hidden" name="id" value={e.id} />}
          <label className="text-xs text-slate-400">Nom du flux<input name="nom" required defaultValue={e?.nom ?? ""} placeholder="Radio Congo Web" className={`mt-1 ${CH}`} /></label>
          <label className="text-xs text-slate-400">Type<select name="type" defaultValue={e?.type ?? "radio"} className={`mt-1 ${CH}`}><option value="radio">Radio</option><option value="podcast">Podcast</option><option value="video">Vidéo</option></select></label>
          <label className="text-xs text-slate-400">Protocole<select name="protocole" defaultValue={e?.protocole ?? "Icecast"} className={`mt-1 ${CH}`}><option>Icecast</option><option>HLS</option><option>Shoutcast</option></select></label>
          <label className="text-xs text-slate-400">Adresse serveur<input name="serveur" defaultValue={e?.serveur ?? ""} placeholder="link.zeno.fm" className={`mt-1 ${CH}`} /></label>
          <label className="text-xs text-slate-400">Port<input name="port" type="number" list="ports-stream" defaultValue={e?.port ?? 80} placeholder="80" className={`mt-1 ${CH}`} /><datalist id="ports-stream"><option value="80" /><option value="443" /><option value="8000" /><option value="8080" /><option value="8443" /></datalist></label>
          <label className="text-xs text-slate-400">Mount (Icecast) / Stream ID (Shoutcast)<input name="mount_point" defaultValue={e?.mount_point ?? ""} placeholder="Icecast: /source · Shoutcast: 1" className={`mt-1 ${CH}`} /></label>
          <label className="text-xs text-slate-400">Utilisateur<input name="username" defaultValue={e?.username ?? "source"} placeholder="source" className={`mt-1 ${CH}`} /></label>
          <label className="text-xs text-slate-400">Mot de passe (Mount) — 🔄 générer<GenerateurMotPasse name="mot_passe" defaultValue={e?.mot_passe ?? ""} /></label>
          <label className="text-xs text-slate-400">Encodage<select name="encodage" defaultValue={e?.encodage ?? "MP3"} className={`mt-1 ${CH}`}><option>MP3</option><option>AAC</option><option>OGG</option></select></label>
          <label className="text-xs text-slate-400">Bitrate (kbps)<select name="bitrate_kbps" defaultValue={String(e?.bitrate_kbps ?? 128)} className={`mt-1 ${CH}`}>{[32, 48, 64, 96, 128, 160, 192, 224, 256, 320].map((b) => <option key={b} value={b}>{b} kbps{b === 128 ? " (standard)" : b === 320 ? " (haute qualité)" : b <= 48 ? " (voix / faible débit)" : ""}</option>)}</select></label>
          <label className="text-xs text-slate-400">Statut<select name="statut" defaultValue={e?.statut ?? "en_ligne"} className={`mt-1 ${CH}`}><option value="en_ligne">En ligne</option><option value="hors_ligne">Hors ligne</option><option value="maintenance">Maintenance</option></select></label>
          <label className="text-xs text-slate-400 md:col-span-2">URL d'écoute publique (laisser vide = auto depuis serveur+mount)<input name="url_flux" defaultValue={e?.url_flux ?? ""} placeholder="https://stream.zeno.fm/2rhg5756d8zuv" className={`mt-1 ${CH}`} /></label>
          <div className="md:col-span-3"><button className={`rounded-lg px-5 py-2.5 font-bold text-white ${e ? "bg-amber-600 hover:bg-amber-500" : "bg-violet-600 hover:bg-violet-500"}`}>{e ? "Enregistrer les modifications" : "🎙 Créer le flux"}</button></div>
        </form>
        <p className="mt-3 text-[11px] text-slate-500">💡 <b>Icecast</b> : Serveur + Port + Mount (/source) + Utilisateur + Mot de passe → https. &nbsp;·&nbsp; <b>Shoutcast</b> : Serveur + Port (8000) + Stream ID + Mot de passe → http (l'URL d'écoute s'adapte au protocole). Colle ces infos dans ton logiciel de diffusion (BUTT, RadioBOSS, OBS…).</p>
      </Carte>

      {/* Flux existants avec lecteur audio */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {rows.map((f) => (
          <Carte key={f.id}>
            <div className="flex items-center gap-2">
              <span className="text-xl">{ICONES[f.type] ?? "📻"}</span>
              <div><h2 className="font-bold text-white">{f.nom}</h2><div className="text-xs text-slate-500">{f.tenant} · {f.protocole}</div></div>
              <span className="ml-auto"><BadgeStatut statut={f.statut} /></span>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3 text-center">
              <div className="border border-[#1c2a4a] rounded-md py-1.5 bg-[#0a1120]"><div className="text-[10px] uppercase text-slate-500">Bitrate</div><div className="text-xs text-slate-200">{f.bitrate_kbps} kbps {f.encodage ?? ""}</div></div>
              <div className="border border-[#1c2a4a] rounded-md py-1.5 bg-[#0a1120]"><div className="text-[10px] uppercase text-slate-500">Auditeurs</div><div className="text-xs text-emerald-300">{f.auditeurs_actuels} (pic {f.auditeurs_pic})</div></div>
              <div className="border border-[#1c2a4a] rounded-md py-1.5 bg-[#0a1120]"><div className="text-[10px] uppercase text-slate-500">Protocole</div><div className="text-xs font-mono text-violet-300">{f.protocole}</div></div>
            </div>

            {/* Lecteur audio */}
            {f.url_flux && <audio controls preload="none" src={f.url_flux} className="mt-3 w-full h-9" />}
            <div className="mt-2 text-[11px] font-mono text-sky-300 bg-[#0a1120] border border-[#1c2a4a] rounded-md px-3 py-2 truncate">▶ {f.url_flux || "(pas d'URL d'écoute)"}</div>

            {/* Config Icecast (diffusion) */}
            {f.serveur && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-slate-400">⚙️ Config diffusion (Icecast)</summary>
                <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px] font-mono text-slate-300">
                  <div className="bg-[#0a1120] border border-[#1c2a4a] rounded px-2 py-1">Serveur : {f.serveur}</div>
                  <div className="bg-[#0a1120] border border-[#1c2a4a] rounded px-2 py-1">Port : {f.port ?? "—"}</div>
                  <div className="bg-[#0a1120] border border-[#1c2a4a] rounded px-2 py-1 col-span-2">Mount : {f.mount_point ?? "—"}</div>
                  <div className="bg-[#0a1120] border border-[#1c2a4a] rounded px-2 py-1">User : {f.username ?? "—"}</div>
                  <div className="bg-[#0a1120] border border-[#1c2a4a] rounded px-2 py-1">Pass : {f.mot_passe ?? "—"}</div>
                </div>
              </details>
            )}

            <div className="mt-3 flex gap-2">
              <Link href={`/console/radio-web?edit=${f.id}`} className="rounded bg-amber-600/80 hover:bg-amber-500 px-3 py-1.5 text-xs text-white">✏️ Modifier</Link>
              <form action={supprimerFlux}><input type="hidden" name="id" value={f.id} /><button className="rounded bg-rose-700 hover:bg-rose-600 px-3 py-1.5 text-xs text-white">Supprimer</button></form>
            </div>
          </Carte>
        ))}
      </div>
    </div>
  );
}
