import { pool } from "@/lib/db";
import { Carte, CarteStat, EnTetePage, BadgeStatut, Tableau } from "@/components/ui";
import PlansStripe from "@/components/plans-stripe";
import { stripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export default async function PageFacturation() {
  const plansRes = await pool.query(`SELECT id, nom, type, prix_mensuel, inclus FROM plans_tarifaires WHERE actif=true ORDER BY prix_mensuel`);
  const [usage, factures, abos] = await Promise.all([
    pool.query(`SELECT u.service, u.unite, SUM(u.quantite) AS quantite, SUM(u.cout)::numeric(12,2) AS cout
      FROM compteurs_usage u WHERE u.periode = '2026-07' GROUP BY u.service, u.unite ORDER BY cout DESC`),
    pool.query(`SELECT f.*, t.nom AS tenant FROM factures f JOIN tenants t ON t.id = f.tenant_id ORDER BY f.created_at DESC`),
    pool.query(`SELECT a.*, t.nom AS tenant, p.nom AS plan FROM abonnements a
      JOIN tenants t ON t.id = a.tenant_id JOIN plans_tarifaires p ON p.id = a.plan_id ORDER BY a.id`),
  ]);
  const totalMois = usage.rows.reduce((s, u) => s + Number(u.cout), 0);
  const enRetard = factures.rows.filter((f) => f.statut === "en_retard");

  return (
    <div>
      <EnTetePage
        rf="RF-018"
        titre="Facturation à la Consommation"
        sousTitre="Prépayé / postpayé avec comptage temps réel via RADIUS (RF-018)"
        couleur="amber"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <CarteStat libelle="Consommation juillet 2026" valeur={`${totalMois.toFixed(2)} $`} couleur="amber" />
        <CarteStat libelle="Abonnements actifs" valeur={abos.rows.filter((a) => a.statut === "actif").length} couleur="emerald" />
        <CarteStat libelle="Factures émises" valeur={factures.rows.length} couleur="sky" />
        <CarteStat libelle="En retard de paiement" valeur={enRetard.length} couleur="cyan" />
      </div>

      <PlansStripe plans={plansRes.rows} stripeActif={stripeConfigured()} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Carte>
          <h2 className="font-bold text-white mb-3">Consommation par service (période en cours)</h2>
          <ul className="space-y-2">
            {usage.rows.map((u) => {
              const pct = totalMois ? Math.round((Number(u.cout) / totalMois) * 100) : 0;
              return (
                <li key={u.service} className="border border-[#1c2a4a] rounded-md px-3 py-2 bg-[#0a1120]">
                  <div className="flex items-center text-sm">
                    <span className="text-slate-200 font-semibold">{u.service}</span>
                    <span className="ml-auto text-amber-200">{Number(u.cout).toFixed(2)} $</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex-1 h-1.5 rounded-full bg-[#131f3a] overflow-hidden">
                      <div className="h-full bg-amber-400/70" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] text-slate-500">{Number(u.quantite).toFixed(0)} {u.unite}</span>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="text-[11px] text-slate-500 mt-3">
            Comptage temps réel : chaque session (voix, data, SMS) est mesurée via RADIUS (Accounting-Start / Interim / Stop) puis valorisée par le Moteur de Facturation.
          </p>
        </Carte>

        <Carte>
          <h2 className="font-bold text-white mb-3">Abonnements (prépayé / postpayé)</h2>
          <ul className="space-y-2">
            {abos.rows.map((a) => (
              <li key={a.id} className="border border-[#1c2a4a] rounded-md px-3 py-2 bg-[#0a1120]">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-100 font-semibold">{a.tenant}</span>
                  <span className="text-xs text-slate-500">· plan {a.plan}</span>
                  <span className="ml-auto"><BadgeStatut statut={a.statut} /></span>
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Mode <span className="uppercase font-bold text-amber-300">{a.mode}</span>
                  {a.mode === "prepaye" && <> · solde <span className="text-emerald-300">{Number(a.solde).toFixed(2)} $</span></>}
                  {" "}· depuis le {new Date(a.date_debut).toLocaleDateString("fr-FR")}
                </div>
              </li>
            ))}
          </ul>
        </Carte>
      </div>

      <h2 className="font-bold text-white mb-3">Factures</h2>
      <Tableau
        entetes={["Numéro", "Tenant", "Période", "Montant", "Statut", "Émise le"]}
        lignes={factures.rows.map((f) => [
          <span key="n" className="font-mono text-xs text-slate-200">{f.numero}</span>,
          <span key="t" className="text-xs text-slate-300">{f.tenant}</span>,
          <span key="p" className="text-xs text-slate-400">{f.periode}</span>,
          <span key="m" className="text-amber-200 font-semibold">{Number(f.montant).toFixed(2)} {f.devise}</span>,
          <BadgeStatut key="s" statut={f.statut} />,
          <span key="d" className="text-xs text-slate-500">{new Date(f.created_at).toLocaleDateString("fr-FR")}</span>,
        ])}
      />
    </div>
  );
}
