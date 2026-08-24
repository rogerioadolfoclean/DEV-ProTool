"use client";
import { useState } from "react";

type Plan = { id: number; nom: string; type: string; prix_mensuel: string; inclus: Record<string, number> | null };

export default function PlansStripe({ plans, stripeActif }: { plans: Plan[]; stripeActif: boolean }) {
  const [busy, setBusy] = useState<number | null>(null);
  const [notice, setNotice] = useState("");

  const souscrire = async (planId: number) => {
    setBusy(planId); setNotice("");
    try {
      const r = await fetch("/api/stripe/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ planId }) });
      const d = await r.json();
      if (!r.ok) { setNotice(d.error || "Erreur"); return; }
      if (d.url) { window.location.href = d.url; return; }          // Paiement Stripe reel
      if (d.activated) { setNotice(`✓ Plan ${d.plan} activé.`); setTimeout(() => location.reload(), 1200); return; }
      if (d.demo) { setNotice(`ℹ️ ${d.message}`); return; }          // Stripe non configure
      setNotice("Réponse inattendue.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Erreur réseau");
    } finally { setBusy(null); }
  };

  return (
    <section className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="font-bold text-white">Plans & abonnement</h2>
        <span className={`text-[11px] rounded-full border px-2 py-0.5 ${stripeActif ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-amber-500/30 bg-amber-500/10 text-amber-300"}`}>
          {stripeActif ? "● Paiement Stripe actif" : "● Paiement en démo (clé Stripe requise)"}
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {plans.map((p) => {
          const prix = Number(p.prix_mensuel);
          return (
            <div key={p.id} className="rounded-xl border border-[#1c2a4a] bg-[#080e1f] p-5 flex flex-col">
              <div className="text-xs font-mono uppercase tracking-wide text-amber-300">{p.type}</div>
              <div className="text-lg font-bold text-white">{p.nom}</div>
              <div className="mt-1 text-2xl font-bold text-white">{prix <= 0 ? "Gratuit" : `${prix.toFixed(0)} $`}<span className="text-xs font-normal text-slate-500">{prix > 0 ? " /mois" : ""}</span></div>
              {p.inclus && (
                <ul className="mt-3 space-y-1 text-xs text-slate-400 flex-1">
                  {Object.entries(p.inclus).map(([k, v]) => <li key={k}>✓ {v.toLocaleString("fr-FR")} {k.replace("_", " ")}</li>)}
                </ul>
              )}
              <button onClick={() => souscrire(p.id)} disabled={busy === p.id} className="mt-4 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 px-4 py-2.5 text-sm font-bold text-white transition">
                {busy === p.id ? "…" : prix <= 0 ? "Activer" : "S'abonner"}
              </button>
            </div>
          );
        })}
      </div>
      {notice && <div className="mt-3 rounded-lg border border-[#1c2a4a] bg-[#0f1a30] px-4 py-3 text-sm text-slate-200">{notice}</div>}
    </section>
  );
}
