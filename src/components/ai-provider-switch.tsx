"use client";

import { useState } from "react";
import type { AiProvider } from "@/lib/ai-provider";

export default function AiProviderSwitch() {
  const [provider, setProvider] = useState<AiProvider>("claude");
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function testProvider() {
    if (!prompt.trim()) return;
    setBusy(true);
    setError("");
    setAnswer("");
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, prompt: prompt.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur IA");
      setAnswer(`[${data.provider} · ${data.model}]\n${data.text}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur IA");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border border-violet-500/30 rounded-lg p-4 bg-[#08101f] mb-6">
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className="text-white font-semibold">Moteur IA</span>
        <span className="text-[11px] text-slate-500">Claude par défaut</span>
        <div className="ml-auto flex rounded-md border border-[#263454] overflow-hidden">
          <button
            type="button"
            onClick={() => setProvider("claude")}
            className={`px-3 py-1.5 text-xs font-semibold ${provider === "claude" ? "bg-violet-500/20 text-violet-200" : "text-slate-400 hover:text-white"}`}
          >
            Claude
          </button>
          <button
            type="button"
            onClick={() => setProvider("openai")}
            className={`px-3 py-1.5 text-xs font-semibold ${provider === "openai" ? "bg-emerald-500/20 text-emerald-200" : "text-slate-400 hover:text-white"}`}
          >
            OpenAI
          </button>
        </div>
      </div>

      <div className="flex gap-2 flex-col md:flex-row">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void testProvider(); }}
          placeholder="Tester le moteur IA…"
          className="flex-1 rounded-md border border-[#263454] bg-[#0a1120] px-3 py-2 text-sm text-white outline-none focus:border-violet-400"
        />
        <button
          type="button"
          disabled={busy || !prompt.trim()}
          onClick={() => void testProvider()}
          className="rounded-md px-4 py-2 text-sm font-semibold bg-violet-500/20 text-violet-200 border border-violet-500/30 disabled:opacity-40"
        >
          {busy ? "Génération…" : `Tester ${provider === "claude" ? "Claude" : "OpenAI"}`}
        </button>
      </div>

      {error && <p className="text-xs text-rose-300 mt-3">{error}</p>}
      {answer && <pre className="whitespace-pre-wrap text-xs text-slate-300 mt-3 border border-[#1c2a4a] rounded-md p-3">{answer}</pre>}
    </div>
  );
}
