"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Actualise l'historique/les stats SANS recharger la page (router.refresh),
// et se met en PAUSE tant que l'utilisateur saisit dans un champ, pour ne
// jamais effacer ce qu'il tape.
export function AutoRefreshHistory() {
  const router = useRouter();
  const [enPause, setEnPause] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => {
      const el = document.activeElement;
      const enSaisie = !!el && ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
      setEnPause(enSaisie);
      if (!enSaisie) router.refresh();
    }, 8000);
    return () => window.clearInterval(id);
  }, [router]);

  return (
    <span className={`ml-2 text-[10px] ${enPause ? "text-amber-400" : "text-emerald-400"}`}>
      {enPause ? "⏸ Actualisation en pause (saisie en cours)" : "● Actualisation automatique"}
    </span>
  );
}
