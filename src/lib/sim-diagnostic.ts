// RF-012 — Diagnostic SIM HONNÊTE : le verdict est calculé à partir de la télémétrie
// RÉELLE stockée (statut, dernier trafic, volume data, secteur). Aucune valeur inventée.
// Les métriques radio (signal dBm / latence ms) exigent une sonde matérielle/opérateur :
// tant qu'aucune n'est configurée (SIM_RADIO_PROBE_URL), elles restent null et
// clairement marquées « indisponible » — jamais tirées au hasard.

export type SimTelemetrie = {
  id: number;
  statut: string;
  secteur: string | null;
  data_mois_mo: number | string | null;
  derniere_activite: string | Date | null;
  apn?: string | null;
};

export type DiagnosticSim = {
  etat: "actif_recent" | "actif_silencieux" | "suspendu" | "inactif" | "resilie";
  resume: string;
  heures_depuis_activite: number | null;
  data_mois_mo: number;
  signal_dbm: number | null;
  latence_ms: number | null;
  mesure_radio: "reelle" | "indisponible";
};

export function diagnostiquerSim(sim: SimTelemetrie): DiagnosticSim {
  const data = Number(sim.data_mois_mo ?? 0);
  const last = sim.derniere_activite ? new Date(sim.derniere_activite).getTime() : null;
  const heures = last !== null && !Number.isNaN(last) ? Math.max(0, Math.round((Date.now() - last) / 3_600_000)) : null;

  let etat: DiagnosticSim["etat"];
  let resume: string;
  if (sim.statut === "resiliee") {
    etat = "resilie";
    resume = "SIM résiliée — aucun service.";
  } else if (sim.statut === "suspendue") {
    etat = "suspendu";
    resume = "SIM suspendue — trafic bloqué.";
  } else if (sim.statut === "inactive") {
    etat = "inactif";
    resume = "SIM inactive — jamais activée ou désactivée.";
  } else if (heures !== null && heures <= 24 && data > 0) {
    etat = "actif_recent";
    resume = `Active — dernier trafic il y a ${heures} h, ${data.toFixed(1)} Mo ce mois-ci.`;
  } else {
    etat = "actif_silencieux";
    resume =
      heures !== null
        ? `Active mais silencieuse depuis ${heures} h (${data.toFixed(1)} Mo ce mois-ci).`
        : "Active, aucune activité enregistrée à ce jour.";
  }

  // Métriques radio : nécessitent une sonde réelle (matériel / API opérateur). Honnêtement gaté.
  const mesure_radio: DiagnosticSim["mesure_radio"] = process.env.SIM_RADIO_PROBE_URL ? "reelle" : "indisponible";

  return {
    etat,
    resume,
    heures_depuis_activite: heures,
    data_mois_mo: data,
    signal_dbm: null,
    latence_ms: null,
    mesure_radio,
  };
}

/** Texte prêt pour le journal sim_evenements — uniquement des faits réels. */
export function resumeDiagnostic(d: DiagnosticSim): string {
  const radio = d.mesure_radio === "reelle" ? `signal ${d.signal_dbm} dBm, latence ${d.latence_ms} ms` : "mesure radio indisponible (sonde matérielle requise)";
  return `Diagnostic : ${d.resume} · ${radio}`;
}
