"use client";
import { useEffect, useMemo, useState } from "react";

type Client = { id: number; external_id: string; name: string; phone: string; city?: string; status: string; last_contact_at?: string };
type CallResult = { ok: boolean; name?: string; phone?: string; callSid?: string; error?: string };
type Health = { configured: boolean; checks?: Record<string, boolean> };

const inputCls = "w-full rounded-lg bg-[#050b18] border border-[#1c2a4a] px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-sky-500/60 focus:ring-2 focus:ring-sky-500/20 transition";

export default function AutoDialerPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [campaign, setCampaign] = useState("Campagne Auto-Dialer");
  const [running, setRunning] = useState(false);
  const [index, setIndex] = useState(0);
  const [notice, setNotice] = useState("");
  const [health, setHealth] = useState<Health | null>(null);
  const [aiNumber, setAiNumber] = useState("");
  const [aiResult, setAiResult] = useState("");
  const [aiBusy, setAiBusy] = useState(false);

  const load = (query = q) => fetch(`/api/clients?q=${encodeURIComponent(query)}`).then(r => r.json()).then(x => setClients(x.data || [])).catch(() => setNotice("Impossible de charger la liste des clients."));
  useEffect(() => { load(""); fetch("/api/voice/health").then(r => r.json()).then(setHealth).catch(() => setHealth({ configured: false })); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const active = useMemo(() => clients.filter(c => c.status === "active"), [clients]);
  const toggle = (id: number) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const callOne = async (id: number): Promise<CallResult> => {
    try {
      const r = await fetch("/api/voice/campaign", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ clientId: id, campaign }) });
      const x = await r.json().catch(() => ({ error: "Réponse serveur invalide" }));
      if (!r.ok) throw new Error(x.error || `Erreur HTTP ${r.status}`);
      return x;
    } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Appel impossible" }; }
  };

  const start = async () => {
    if (!selected.length) return setNotice("Sélectionnez au moins un numéro.");
    if (health && !health.configured) return setNotice("Téléphonie IA non configurée (Twilio) : utilisez « Appel local » ou configurez les clés.");
    setRunning(true); setIndex(0);
    let ok = 0, failed = 0;
    for (let i = 0; i < selected.length; i++) {
      setIndex(i + 1);
      const result = await callOne(selected[i]);
      if (result.ok) { ok++; setNotice(`✓ Appel lancé : ${result.name ?? ""} ${result.phone ?? ""}`); }
      else { failed++; setNotice(`✗ Échec : ${result.error}`); }
      if (i < selected.length - 1) await new Promise(r => setTimeout(r, 1200));
    }
    setRunning(false);
    setNotice(failed ? `Terminé : ${ok} appel(s) lancé(s), ${failed} échec(s).` : `Terminé : ${ok} appel(s) lancé(s).`);
    load();
  };

  const localCall = (phone: string, name: string) => { if (!phone) return setNotice("Numéro absent."); setNotice(`Ouverture de l'appel local vers ${name}…`); window.location.href = `tel:${phone.replace(/[^+\d]/g, "")}`; };

  const qualify = async () => {
    if (!aiNumber.trim()) return;
    setAiBusy(true); setAiResult("");
    try {
      const r = await fetch("/api/ai/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ provider: "claude", prompt: `Prépare la qualification commerciale du prospect au numéro ${aiNumber}. Donne les questions à poser, les signaux d'intérêt, les objections probables et la prochaine étape. N'invente aucune information personnelle.`, system: "Tu es l'agent IA de qualification commerciale d'OmniComm 360°. Professionnel, légal, non manipulateur." }) });
      const d = await r.json(); setAiResult(d.text || d.error || "Aucune réponse");
    } finally { setAiBusy(false); }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-mono uppercase tracking-wider text-cyan-400">AUTO-DIALER</div>
          <h1 className="text-3xl font-bold text-white">☎ Auto-Dialer + IA</h1>
          <p className="text-slate-400 mt-1">Sélectionnez des clients et lancez des appels réels via Twilio, ou appelez localement. Qualification assistée par IA.</p>
        </div>
        <div className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold ${health?.configured ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-amber-500/30 bg-amber-500/10 text-amber-300"}`}>
          {health ? (health.configured ? "● Téléphonie Twilio active" : "● Twilio non configuré — appel local dispo") : "● Vérification…"}
        </div>
      </div>

      {/* Barre de contrôle */}
      <div className="rounded-xl border border-[#1c2a4a] bg-[#080e1f] p-4">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1"><label className="text-xs text-slate-400">Campagne</label><input className={`mt-1 ${inputCls}`} value={campaign} onChange={e => setCampaign(e.target.value)} /></div>
          <div className="lg:col-span-2"><label className="text-xs text-slate-400">Rechercher un client</label>
            <div className="mt-1 flex gap-2">
              <input className={inputCls} value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === "Enter" && load()} placeholder="Nom, téléphone…" />
              <button onClick={() => load()} className="shrink-0 rounded-lg bg-sky-600 hover:bg-sky-500 px-4 text-sm font-semibold text-white transition">Rechercher</button>
            </div>
          </div>
          <div className="flex items-end"><button onClick={() => setSelected(active.map(c => c.id))} className="w-full rounded-lg border border-[#1c2a4a] hover:bg-white/5 px-3 py-2.5 text-sm text-slate-300 transition">Tout sélectionner ({active.length})</button></div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button disabled={running} onClick={start} className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-5 py-2.5 text-sm font-bold text-white transition">🤖 {running ? `Appels ${index}/${selected.length}…` : `Lancer ${selected.length} appel(s) Twilio`}</button>
          <button disabled={running || !selected.length} onClick={() => { const c = clients.find(x => x.id === selected[0]); if (c) localCall(c.phone, c.name); }} className="rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 px-5 py-2.5 text-sm font-bold text-white transition">📱 Appel local</button>
          <span className="text-xs text-slate-500">{selected.length} sélectionné(s) · {active.length} actif(s)</span>
        </div>
      </div>

      {/* Tableau clients */}
      <div className="rounded-xl border border-[#1c2a4a] bg-[#080e1f] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500">
                {["", "Client", "Téléphone", "Ville", "Statut", "Dernier contact", ""].map((h, i) => <th key={i} className="px-4 py-3 font-medium border-b border-[#1c2a4a] whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {clients.length ? clients.map(c => (
                <tr key={c.id} className="hover:bg-sky-500/5 transition">
                  <td className="px-4 py-3 border-b border-[#0f1a30]"><input type="checkbox" className="h-4 w-4 accent-sky-500" checked={selected.includes(c.id)} disabled={c.status !== "active" || running} onChange={() => toggle(c.id)} /></td>
                  <td className="px-4 py-3 border-b border-[#0f1a30]"><div className="font-medium text-white">{c.name}</div><div className="text-[11px] font-mono text-slate-600">{c.external_id}</div></td>
                  <td className="px-4 py-3 border-b border-[#0f1a30] font-mono text-slate-300 whitespace-nowrap">{c.phone}</td>
                  <td className="px-4 py-3 border-b border-[#0f1a30] text-slate-400">{c.city || "—"}</td>
                  <td className="px-4 py-3 border-b border-[#0f1a30]"><span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] ${c.status === "active" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-slate-500/30 bg-slate-500/10 text-slate-300"}`}><span className={`h-1.5 w-1.5 rounded-full ${c.status === "active" ? "bg-emerald-400" : "bg-slate-400"}`} />{c.status === "active" ? "Actif" : c.status}</span></td>
                  <td className="px-4 py-3 border-b border-[#0f1a30] text-slate-400 whitespace-nowrap">{c.last_contact_at ? new Date(c.last_contact_at).toLocaleString("fr-FR") : "—"}</td>
                  <td className="px-4 py-3 border-b border-[#0f1a30]"><button disabled={c.status !== "active" || running} onClick={() => localCall(c.phone, c.name)} className="rounded-md border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 disabled:opacity-40 px-2.5 py-1.5 text-xs text-amber-300 transition">📱 Appeler</button></td>
                </tr>
              )) : (
                <tr><td colSpan={7} className="px-4 py-14 text-center"><div className="text-3xl mb-2">📇</div><div className="text-slate-300 font-medium">Aucun client</div><div className="text-sm text-slate-500 mt-1">Ajoutez des clients depuis le module Clients.</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Qualification IA */}
      <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-5">
        <h2 className="font-bold text-white">🧠 Qualification IA d'un prospect</h2>
        <p className="text-sm text-slate-400 mt-1">Prépare l'appel : questions, signaux d'intérêt, objections, prochaine étape.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input className={`${inputCls} max-w-xs`} value={aiNumber} onChange={e => setAiNumber(e.target.value)} placeholder="+243…" />
          <button onClick={qualify} disabled={aiBusy || !aiNumber.trim()} className="rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 px-4 py-2.5 text-sm font-bold text-white transition">{aiBusy ? "IA…" : "🧠 Qualifier"}</button>
        </div>
        {aiResult && <div className="mt-4 rounded-lg border border-violet-500/30 bg-[#080e1f] p-4 whitespace-pre-wrap leading-7 text-slate-200">{aiResult}</div>}
      </div>

      {notice && <button onClick={() => setNotice("")} className="fixed bottom-5 right-5 z-50 rounded-lg border border-[#1c2a4a] bg-[#0f1a30] px-4 py-3 text-sm text-white shadow-lg shadow-black/40 hover:bg-[#16233f] transition">{notice} <span className="text-slate-500">×</span></button>}
    </section>
  );
}
