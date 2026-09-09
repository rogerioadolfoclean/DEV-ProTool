// RF-010 — Sonde de flux radio/streaming.
// Interroge RÉELLEMENT le serveur de diffusion pour connaître l'état en direct :
//   • Icecast   → /status-json.xsl        (auditeurs réels par mount)
//   • Shoutcast → /statistics?json=1       (currentlisteners) puis repli /stats
//   • Sinon (Zeno.fm, HLS…) → test d'accessibilité de l'URL d'écoute (en ligne / hors ligne)
// AUCUN chiffre inventé : si le fournisseur n'expose pas le nombre d'auditeurs,
// on renvoie listeners = null et on met seulement à jour l'état en ligne/hors ligne.

export type SondeFlux = {
  serveur: string | null;
  port: number | null;
  mount_point: string | null;
  protocole: string;
  url_flux: string | null;
};

export type ResultatSonde = {
  online: boolean;
  listeners: number | null; // null = non exposé par ce fournisseur
  titre: string | null; // morceau en cours si disponible
  source: string; // d'où vient l'info (icecast / shoutcast / accessibilite / erreur)
  detail?: string;
};

const TIMEOUT_MS = 7000;

function hote(serveur: string): string {
  return serveur.replace(/^https?:\/\//, "").replace(/\/.*$/, "").trim();
}

async function fetchAvecTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal, cache: "no-store", redirect: "follow" });
  } finally {
    clearTimeout(t);
  }
}

// Normalise le mount pour comparer (enlève / de tête, /source de queue).
function normMount(m: string | null | undefined): string {
  return (m ?? "").replace(/^\//, "").replace(/\/source$/i, "").trim().toLowerCase();
}

/** Icecast : /status-json.xsl. Retourne auditeurs du mount ciblé (ou total). */
async function sonderIcecast(base: string, mount: string | null): Promise<ResultatSonde | null> {
  try {
    const r = await fetchAvecTimeout(`${base}/status-json.xsl`);
    if (!r.ok) return null;
    const j = (await r.json()) as { icestats?: { source?: unknown } };
    let sources = j?.icestats?.source;
    if (!sources) return { online: true, listeners: 0, titre: null, source: "icecast", detail: "serveur en ligne, aucun mount actif" };
    if (!Array.isArray(sources)) sources = [sources];
    const arr = sources as Array<{ listenurl?: string; listeners?: number; title?: string; server_name?: string }>;
    const cible = normMount(mount);
    const match = cible
      ? arr.find((s) => normMount((s.listenurl ?? "").replace(/.*\/(?=[^/]*$)/, "/" + (s.listenurl ?? "").split("/").pop())) === cible || (s.listenurl ?? "").toLowerCase().includes(cible))
      : null;
    const choisi = match ?? (arr.length === 1 ? arr[0] : null);
    const listeners = choisi ? Number(choisi.listeners ?? 0) : arr.reduce((a, s) => a + Number(s.listeners ?? 0), 0);
    const titre = choisi?.title ?? choisi?.server_name ?? null;
    return { online: true, listeners, titre, source: "icecast" };
  } catch {
    return null;
  }
}

/** Shoutcast v2 : /statistics?json=1 (ou /stats). */
async function sonderShoutcast(base: string): Promise<ResultatSonde | null> {
  for (const chemin of ["/statistics?json=1", "/stats?json=1", "/statistics"]) {
    try {
      const r = await fetchAvecTimeout(`${base}${chemin}`);
      if (!r.ok) continue;
      const txt = await r.text();
      try {
        const j = JSON.parse(txt) as { streams?: Array<{ currentlisteners?: number; songtitle?: string }>; currentlisteners?: number; songtitle?: string };
        const s0 = j.streams?.[0];
        const listeners = Number(s0?.currentlisteners ?? j.currentlisteners ?? 0);
        const titre = s0?.songtitle ?? j.songtitle ?? null;
        return { online: true, listeners, titre, source: "shoutcast" };
      } catch {
        // XML : <CURRENTLISTENERS>n</CURRENTLISTENERS>
        const m = txt.match(/<CURRENTLISTENERS>(\d+)<\/CURRENTLISTENERS>/i);
        if (m) return { online: true, listeners: Number(m[1]), titre: null, source: "shoutcast" };
      }
    } catch {
      /* essaie le chemin suivant */
    }
  }
  return null;
}

/** Repli : simple test d'accessibilité de l'URL d'écoute (en ligne / hors ligne). */
async function sonderAccessibilite(url: string): Promise<ResultatSonde> {
  try {
    const r = await fetchAvecTimeout(url, { method: "GET", headers: { Range: "bytes=0-1", Icy: "1" } });
    const ct = r.headers.get("content-type") ?? "";
    const online = r.ok || r.status === 206 || r.status === 200 || /audio|mpegurl|ogg|octet-stream/i.test(ct);
    return { online, listeners: null, titre: r.headers.get("icy-name") ?? null, source: "accessibilite", detail: `HTTP ${r.status} ${ct}` };
  } catch (e) {
    return { online: false, listeners: null, titre: null, source: "erreur", detail: e instanceof Error ? e.message : "injoignable" };
  }
}

/** Sonde principale : choisit la méthode selon le protocole. */
export async function sonderFlux(f: SondeFlux): Promise<ResultatSonde> {
  const proto = (f.protocole || "").toLowerCase();
  const h = f.serveur ? hote(f.serveur) : "";
  const scheme = f.port === 443 || (f.serveur ?? "").startsWith("https") ? "https" : proto === "shoutcast" ? "http" : "https";
  const portPart = f.port && f.port !== 80 && f.port !== 443 ? `:${f.port}` : "";
  const base = h ? `${scheme}://${h}${portPart}` : "";

  if (base && proto === "icecast") {
    const r = await sonderIcecast(base, f.mount_point);
    if (r) return r;
  }
  if (base && proto === "shoutcast") {
    const r = await sonderShoutcast(base);
    if (r) return r;
  }
  // Icecast injoignable via status-json, ou HLS/Zeno/inconnu → test d'accessibilité.
  if (f.url_flux) return sonderAccessibilite(f.url_flux);
  if (base) return sonderAccessibilite(base + (f.mount_point ? `/${normMount(f.mount_point)}` : ""));
  return { online: false, listeners: null, titre: null, source: "erreur", detail: "aucune URL à sonder" };
}
