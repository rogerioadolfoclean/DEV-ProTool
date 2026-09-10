import { pool } from "@/lib/db";
import { Carte, CarteStat, EnTetePage, Tableau } from "@/components/ui";
import { geolocationConfiguree } from "@/lib/geolocation";

export const dynamic = "force-dynamic";

export default async function PageGeoloc() {
  const configure = geolocationConfiguree();
  const [points, stats] = await Promise.all([
    pool.query(`SELECT g.*, s.etiquette, s.msisdn, s.secteur FROM geolocalisations g
      JOIN sims s ON s.id = g.sim_id ORDER BY g.created_at DESC LIMIT 25`),
    pool.query(`SELECT COUNT(*) AS n, COUNT(DISTINCT sim_id) AS sims,
      COALESCE(ROUND(AVG(precision_m)),0) AS prec,
      COUNT(*) FILTER (WHERE methode = 'cell-id') AS reelles FROM geolocalisations`),
  ]);
  const s = stats.rows[0];
  const reelles = Number(s.reelles);

  return (
    <div>
      <EnTetePage
        rf="RF-013"
        titre="Géolocalisation (Triangulation)"
        sousTitre="Localisation des équipements via les antennes GSM/LTE (Cell-ID) — sans GPS (RF-013)"
        couleur="emerald"
      />

      {/* Bannière d'état HONNÊTE : réel si un fournisseur d'antennes est connecté. */}
      <div
        className={`mb-5 rounded-lg border px-4 py-3 text-sm ${
          configure
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
            : "border-amber-500/40 bg-amber-500/10 text-amber-200"
        }`}
      >
        {configure ? (
          <>
            <span className="font-bold">● Géolocalisation cellulaire ACTIVE.</span> Les positions sont calculées en temps
            réel à partir des antennes qui voient l&apos;équipement (base d&apos;antennes réelle). Envoyez les cellules via
            <span className="font-mono"> POST /api/v1/geolocation</span>.
          </>
        ) : (
          <>
            <span className="font-bold">⚠️ Mode démonstration.</span> Aucun fournisseur de localisation cellulaire
            n&apos;est connecté (variable <span className="font-mono">UNWIREDLABS_API_KEY</span> absente). Les positions
            ci-dessous sont des <b>exemples</b> — aucune n&apos;est réelle tant que la clé n&apos;est pas posée. Le système
            ne fabrique jamais de position réelle sans fournisseur.
          </>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <CarteStat libelle="Positions relevées" valeur={s.n} couleur="emerald" />
        <CarteStat libelle="Dont réelles (Cell-ID)" valeur={reelles} detail={reelles === 0 ? "aucune pour l'instant" : "résolues par antenne"} couleur={reelles > 0 ? "emerald" : "slate"} />
        <CarteStat libelle="Équipements localisés" valeur={s.sims} couleur="sky" />
        <CarteStat libelle="Précision moyenne" valeur={`${s.prec} m`} detail="selon les cellules vues" couleur="amber" />
      </div>

      <Carte className="mb-6">
        <h2 className="font-bold text-white mb-2">Comment ça marche (Cell-ID / triangulation)</h2>
        <p className="text-sm text-slate-400">
          Un équipement IoT ne connaît pas sa position, mais il connaît les <b>antennes qui le voient</b> (identifiants
          MCC/MNC/LAC/CID et puissance du signal). La plateforme envoie ces cellules à une <b>base d&apos;antennes réelle</b>
          qui renvoie les coordonnées ; avec plusieurs cellules, la position est affinée par <b>triangulation</b>. Idéal pour
          les capteurs AgriTech et les engins miniers sans module GPS.
        </p>
        <p className="text-xs text-slate-500 mt-3">
          <b>Pour envoyer une position réelle :</b>{" "}
          <span className="font-mono text-slate-300">
            POST /api/v1/geolocation
          </span>{" "}
          avec <span className="font-mono text-slate-300">{`{ sim_id, mcc, mnc, cells:[{lac, cid, signal}] }`}</span>{" "}
          (en-tête <span className="font-mono">Authorization: Bearer &lt;clé&gt;</span>).
        </p>
      </Carte>

      <h2 className="font-bold text-white mb-3">Dernières positions</h2>
      <Tableau
        entetes={["Équipement", "MSISDN", "Secteur", "Latitude", "Longitude", "Précision", "Cellules", "Source", "Horodatage"]}
        lignes={points.rows.map((p) => {
          const reel = p.methode === "cell-id";
          return [
            <span key="e" className="text-xs text-slate-200">{p.etiquette}</span>,
            <span key="m" className="font-mono text-xs text-slate-400">{p.msisdn}</span>,
            <span key="s" className="text-xs uppercase text-emerald-300">{p.secteur}</span>,
            <span key="la" className="font-mono text-xs text-sky-300">{Number(p.latitude).toFixed(5)}</span>,
            <span key="lo" className="font-mono text-xs text-sky-300">{Number(p.longitude).toFixed(5)}</span>,
            <span key="pr" className="text-xs text-slate-300">±{p.precision_m} m</span>,
            <span key="c" className="font-mono text-[11px] text-slate-500">
              {(p.cellules as { cellId?: number; cid?: number; rssi?: number; signal?: number }[]).map(
                (c) => `#${c.cellId ?? c.cid} (${c.rssi ?? c.signal ?? "?"} dBm)`
              ).join(" · ")}
            </span>,
            <span
              key="src"
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                reel ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-500/15 text-slate-400"
              }`}
            >
              {reel ? "cellulaire réel" : "exemple (démo)"}
            </span>,
            <span key="d" className="text-xs text-slate-500">{new Date(p.created_at).toLocaleString("fr-FR")}</span>,
          ];
        })}
      />
    </div>
  );
}
