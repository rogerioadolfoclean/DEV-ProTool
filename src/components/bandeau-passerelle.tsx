import Link from "next/link";
import { etatPasserelle } from "@/lib/gateway";

/**
 * Bandeau affiché tant que la passerelle opérateur n'est pas configurée.
 * Sans lui, la console laisse croire que les messages partent réellement.
 */
export function BandeauPasserelle() {
  const etat = etatPasserelle();
  if (etat.configuree) {
    const LABELS: Record<string, string> = { sms: "SMS", voix: "appels", whatsapp: "WhatsApp" };
    const reels = etat.canauxReels.map((c) => LABELS[c] ?? c).join(", ") || "aucun canal";
    const whatsappDemo = !etat.canauxReels.includes("whatsapp");
    return (
      <div className="mb-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 flex items-center gap-3 flex-wrap">
        <span className="text-emerald-300 font-bold text-sm">● PASSERELLE ACTIVE</span>
        <span className="text-xs text-emerald-200/80">
          Canaux réels : <strong>{reels}</strong> via Twilio ({etat.numeroAffiche}).
          {whatsappDemo && <span className="text-amber-300/90"> WhatsApp en démo (configurer Meta Cloud API ou TWILIO_WHATSAPP_FROM).</span>}
        </span>
        <Link href="/console/passerelle" className="ml-auto text-xs text-emerald-300 hover:underline">
          Diagnostic →
        </Link>
      </div>
    );
  }
  return (
    <div className="mb-4 rounded-lg border-2 border-orange-500/50 bg-orange-500/10 px-4 py-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-orange-300 font-bold text-sm">⚠ MODE DÉMONSTRATION — AUCUN ENVOI RÉEL</span>
        <Link href="/console/passerelle" className="ml-auto text-xs text-orange-300 hover:underline">
          Comment activer les envois réels →
        </Link>
      </div>
      <p className="text-xs text-orange-100/80 mt-1.5">
        Les messages et appels sont enregistrés, routés (Least-Cost), facturés et tracés en base — mais
        <strong className="text-orange-200"> aucun SMS ni appel ne part physiquement</strong>. Ils portent le statut
        « simulé ». Configurez les identifiants de la passerelle pour émettre réellement.
      </p>
    </div>
  );
}
