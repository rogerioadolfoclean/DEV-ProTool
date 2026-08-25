import type { ReactNode } from "react";

/** Accents par domaine (classes complètes pour que Tailwind les génère). */
export const ACCENTS: Record<string, { bord: string; texte: string; fond: string; puce: string }> = {
  sky: { bord: "border-sky-500/40", texte: "text-sky-300", fond: "bg-sky-500/10", puce: "bg-sky-400" },
  violet: { bord: "border-violet-500/40", texte: "text-violet-300", fond: "bg-violet-500/10", puce: "bg-violet-400" },
  emerald: { bord: "border-emerald-500/40", texte: "text-emerald-300", fond: "bg-emerald-500/10", puce: "bg-emerald-400" },
  amber: { bord: "border-amber-500/40", texte: "text-amber-300", fond: "bg-amber-500/10", puce: "bg-amber-400" },
  cyan: { bord: "border-cyan-500/40", texte: "text-cyan-300", fond: "bg-cyan-500/10", puce: "bg-cyan-400" },
};

export function Carte({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`carte p-4 ${className}`}>{children}</div>;
}

export function EnTetePage({
  rf,
  titre,
  sousTitre,
  couleur = "sky",
}: {
  rf?: string;
  titre: string;
  sousTitre?: string;
  couleur?: string;
}) {
  const a = ACCENTS[couleur] ?? ACCENTS.sky;
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 flex-wrap">
        {rf && (
          <span className={`text-xs font-mono px-2 py-1 rounded ${a.fond} ${a.texte} border ${a.bord}`}>
            {rf}
          </span>
        )}
        <h1 className="text-2xl font-bold text-white">{titre}</h1>
      </div>
      {sousTitre && <p className="text-slate-400 mt-1">{sousTitre}</p>}
    </div>
  );
}

export function CarteStat({
  libelle,
  valeur,
  detail,
  couleur = "sky",
}: {
  libelle: string;
  valeur: string | number;
  detail?: string;
  couleur?: string;
}) {
  const a = ACCENTS[couleur] ?? ACCENTS.sky;
  return (
    <div className={`carte p-4 border-l-4 ${a.bord}`}>
      <div className="text-xs uppercase tracking-wide text-slate-400">{libelle}</div>
      <div className={`text-2xl font-bold mt-1 ${a.texte}`}>{valeur}</div>
      {detail && <div className="text-xs text-slate-500 mt-1">{detail}</div>}
    </div>
  );
}

const COULEURS_STATUT: Record<string, string> = {
  livre: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  envoye: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  en_attente: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  echoue: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  rejete_dnd: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  simule: "bg-orange-500/15 text-orange-300 border-orange-500/40",
  termine: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  en_cours: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  sans_reponse: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  boite_vocale: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  suspendue: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  inactive: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  resiliee: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  actif: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  suspendu: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  configuration: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  en_ligne: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  hors_ligne: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  maintenance: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  disponible: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  attribue: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  porte: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  resilie: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  payee: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  en_retard: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  annulee: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  nouvelle: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  resolue: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  faux_positif: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  critique: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  haute: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  moyenne: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  basse: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  initie: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  sonnerie: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  planifiee: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  terminee: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
};

const LIBELLES_STATUT: Record<string, string> = {
  livre: "Livré",
  envoye: "Envoyé",
  en_cours: "En cours",
  en_attente: "En attente",
  echoue: "Échoué",
  rejete_dnd: "Rejeté (DND)",
  simule: "Simulé",
  termine: "Terminé",
  sans_reponse: "Sans réponse",
  boite_vocale: "Boîte vocale",
};

export function BadgeStatut({ statut }: { statut: string }) {
  const c = COULEURS_STATUT[statut] ?? "bg-slate-500/15 text-slate-300 border-slate-500/30";
  const libelle = LIBELLES_STATUT[statut] ?? statut.replace(/_/g, " ");
  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded-full border ${c}`}>
      {libelle}
    </span>
  );
}

export function Tableau({
  entetes,
  lignes,
}: {
  entetes: string[];
  lignes: ReactNode[][];
}) {
  return (
    <div className="overflow-x-auto carte">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#1c2a4a] text-left">
            {entetes.map((e) => (
              <th key={e} className="px-3 py-2.5 text-xs uppercase tracking-wide text-slate-400 whitespace-nowrap">
                {e}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lignes.length === 0 && (
            <tr>
              <td colSpan={entetes.length} className="px-3 py-6 text-center text-slate-500">
                Aucune donnée pour le moment.
              </td>
            </tr>
          )}
          {lignes.map((cellules, i) => (
            <tr key={i} className="border-b border-[#131f3a] hover:bg-sky-500/5">
              {cellules.map((c, j) => (
                <td key={j} className="px-3 py-2 whitespace-nowrap">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const CHAMP =
  "w-full rounded-md bg-[#0a1120] border border-[#1c2a4a] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500";
export const BOUTON =
  "inline-flex items-center gap-2 rounded-md bg-sky-600 hover:bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition-colors cursor-pointer disabled:opacity-50";
export const BOUTON_DISCRET =
  "inline-flex items-center gap-1 rounded-md border border-[#1c2a4a] hover:border-sky-500/60 px-2.5 py-1 text-xs text-slate-300 transition-colors cursor-pointer";
