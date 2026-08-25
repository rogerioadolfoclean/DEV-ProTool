"use client";
import { useState } from "react";

// Champ avec generateur de mot de passe dynamique + copie (style Zeno.fm "Reset").
function genererMotPasse(longueur = 14): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const arr = new Uint32Array(longueur);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => chars[n % chars.length]).join("");
}

export default function GenerateurMotPasse({ name, defaultValue = "", placeholder = "••••••", longueur = 14 }: { name: string; defaultValue?: string; placeholder?: string; longueur?: number }) {
  const [valeur, setValeur] = useState(defaultValue);
  const [copie, setCopie] = useState(false);

  const copier = async () => {
    if (!valeur) return;
    try { await navigator.clipboard.writeText(valeur); setCopie(true); setTimeout(() => setCopie(false), 1200); } catch { /* ignore */ }
  };

  return (
    <div className="mt-1 flex gap-1">
      <input
        name={name}
        value={valeur}
        onChange={(e) => setValeur(e.target.value)}
        placeholder={placeholder}
        className="flex-1 rounded-lg bg-[#050b18] border border-[#1c2a4a] px-3 py-2 text-white text-sm font-mono"
      />
      <button type="button" onClick={() => setValeur(genererMotPasse(longueur))} title="Générer un mot de passe" className="shrink-0 rounded-lg bg-violet-600 hover:bg-violet-500 px-3 text-sm text-white">🔄</button>
      <button type="button" onClick={copier} title="Copier" className="shrink-0 rounded-lg border border-[#1c2a4a] hover:bg-white/5 px-3 text-sm text-slate-300">{copie ? "✓" : "⧉"}</button>
    </div>
  );
}
