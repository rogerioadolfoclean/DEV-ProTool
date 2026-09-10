import { pool } from "@/lib/db";
import { Carte, CarteStat, EnTetePage, Tableau } from "@/components/ui";
import { baseAntennesInfo } from "@/lib/geolocation";

export const dynamic = "force-dynamic";

export default async function PageGeoloc() {
  const [base, points, stats] = await Promise.all([
    baseAntennesInfo(),
    pool.query(`SELECT g.*, s.etiquette, s.msisdn, s.secteur FROM geolocalisations g
      JOIN sims s ON s.id = g.sim_id ORDER BY g.created_at DESC LIMIT 25`),
    pool.query(`SELECT COUNT(*) AS n, COUNT(DISTINCT sim_id) AS sims,
      COALESCE(ROUND(AVG(precision_m)),0) AS prec,
      COUNT(*) FILTER (WHERE methode = 'cell-id') AS reelles FROM geolocalisations`),
  ]);
  const s = stats.rows[0];
  const reelles = Number(s.reelles);
  const basePrete = base.total > 0;

  return (
    <div>
      <EnTetePage
        rf="RF-013"
        titre="Géolocalisation (Triangulation)"
        sousTitre="Localisation des équipements via les antennes GSM/LTE (Cell-ID) — NOTRE API, sans GPS (RF-013)"
        couleur="emerald"
      />

      {/* Bannière d'état HONNÊTE : dépend de NOTRE base d'antennes (aucun tiers). */}
      <div
        className={`mb-5 rounded-lg border px-4 py-3 text-sm ${
          basePrete
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
            : "border-amber-500/40 bg-amber-500/10 text-amber-200"
        }`}
      >
        {basePrete ? (
          <>
            <span className="font-bold">● NOTRE API de géolocalisation est ACTIVE.</span>{" "}
            <b>{base.total.toLocaleString("fr-FR")}</b> antennes réelles hébergées dans notre base — positions calculées par
            NOTRE moteur de triangulation, sans fournisseur tiers ni coût par appel. Endpoint payant :{" "}
            <span className="font-mono">POST /api/v1/geolocation</span>.
          </>
        ) : (
          <>
            <span className="font-bold">⚠️ Base d&apos;antennes vide.</span> NOTRE moteur est prêt, mais aucune antenne
            n&apos;est encore chargée. Lancez l&apos;import unique des données ouvertes OpenCelliD :{" "}
            <span className="font-mono">node scripts/migration-cell-towers.js</span> puis{" "}
            <span className="font-mono">node scripts/import-cell-towers.js &lt;fichier.csv&gt; 630,631,724</span>. Tant que
            la base est vide, aucune position réelle n&apos;est inventée ; les points ci-dessous sont des exemples de démo.
          </>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <CarteStat libelle="Antennes en base (à nous)" valeur={base.total.toLocaleString("fr-FR")} detail={basePrete ? "OpenCelliD hébergé" : "à importer"} couleur={basePrete ? "emerald" : "amber"} />
        <CarteStat libelle="Positions relevées" valeur={s.n} couleur="sky" />
        <CarteStat libelle="Dont réelles (Cell-ID)" valeur={reelles} detail={reelles === 0 ? "aucune pour l'instant" : "résolues par antenne"} couleur={reelles > 0 ? "emerald" : "slate"} />
        <CarteStat libelle="Précision moyenne" valeur={`${s.prec} m`} detail="selon les cellules vues" couleur="amber" />
      </div>

      <Carte className="mb-6">
        <h2 className="font-bold text-white mb-2">NOTRE géolocalisation Cell-ID (sans fournisseur tiers)</h2>
        <p className="text-sm text-slate-400">
          Un équipement IoT ne connaît pas sa position, mais il connaît les <b>antennes qui le voient</b> (MCC/MNC/LAC/CID +
          puissance du signal). La plateforme résout chaque antenne dans <b>notre propre base d&apos;antennes</b> (données
          ouvertes OpenCelliD, hébergées chez nous) et calcule la position par <b>barycentre pondéré</b> — plusieurs
          antennes = triangulation. Aucun appel à un service externe, aucun coût par requête : c&apos;est <b>notre API que
          nous vendons</b>.
        </p>
        <p className="text-xs text-slate-500 mt-3">
          <b>Pour localiser un équipement :</b>{" "}
          <span className="font-mono text-slate-300">POST /api/v1/geolocation</span>{" "}
          avec <span className="font-mono text-slate-300">{`{ sim_id, mcc, mnc, cells:[{lac, cid, signal}] }`}</span>{" "}
          (en-tête <span className="font-mono">Authorization: Bearer &lt;clé&gt;</span>). Facturé à l&apos;usage selon le
          plan du client (clé API + logs = compteur).
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
