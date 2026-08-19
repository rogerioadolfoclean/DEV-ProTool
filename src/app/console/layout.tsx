import Link from "next/link";
import { exigerSession } from "@/lib/auth";
import { seDeconnecter } from "@/lib/auth-actions";
import { DOMAINES } from "@/lib/constants";
import { ACCENTS } from "@/components/ui";
import { BandeauPasserelle } from "@/components/bandeau-passerelle";
import { PushNotifications } from "@/components/push-notifications";

const COMMERCIAL = [
  { href: "/console/campagnes", label: "📣 Campagnes" },
  { href: "/console/listes-appels", label: "☷ Listes d'appels" },
  { href: "/auto-dialer", label: "☎ Auto-Dialer" },
  { href: "/console/file-appels", label: "↻ File d'appels" },
  { href: "/clients", label: "♙ Clients" },
  { href: "/console/contacts", label: "♧ Contacts" },
  { href: "/console/rendez-vous", label: "□ Rendez-vous" },
];

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const session = await exigerSession();

  return (
    <div className="console-root flex-1 flex min-h-screen bg-[#050b18] text-slate-100">
      <aside className="hidden lg:flex w-72 flex-col border-r border-[#1c2a4a] bg-[#080e1f] max-h-screen sticky top-0 overflow-y-auto">
        <div className="px-4 py-4 border-b border-[#1c2a4a]">
          <Link href="/console" className="font-bold text-white">
            OmniComm <span className="text-sky-400">360°</span>
            <span className="block text-[11px] font-normal text-slate-500">Console de la plateforme</span>
          </Link>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-4">
          <Link href="/console" className="block px-3 py-2 rounded-md text-sm text-slate-200 hover:bg-sky-500/10 border border-transparent hover:border-sky-500/30">📊 Vue d&apos;ensemble</Link>
          <Link href="/console/historique" className="block px-3 py-2 rounded-md text-sm text-slate-200 hover:bg-sky-500/10 border border-transparent hover:border-sky-500/30">🕒 Historique universel</Link>
          <Link href="/console/passerelle" className="block px-3 py-2 rounded-md text-sm text-slate-200 hover:bg-sky-500/10 border border-transparent hover:border-sky-500/30">🔌 Passerelle opérateur</Link>

          <div>
            <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-amber-400">3.0 — Gestion commerciale</div>
            <ul className="mt-1 space-y-0.5">
              {COMMERCIAL.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="flex items-center gap-2 px-3 py-1.5 rounded-md text-[13px] text-slate-300 hover:text-white hover:bg-sky-500/10">
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {DOMAINES.map((d) => {
            const a = ACCENTS[d.couleur];
            return (
              <div key={d.numero}>
                <div className={`px-3 text-[11px] font-bold uppercase tracking-wider ${a.texte}`}>{d.numero} — {d.nom}</div>
                <ul className="mt-1 space-y-0.5">
                  {d.modules.map((m) => (
                    <li key={m.rf}>
                      <Link href={m.href} className="flex items-center gap-2 px-3 py-1.5 rounded-md text-[13px] text-slate-300 hover:text-white hover:bg-sky-500/10">
                        <span className={`h-1.5 w-1.5 rounded-full ${a.puce}`} />
                        <span className="truncate">{m.titre}</span>
                        <span className="ml-auto text-[10px] font-mono text-slate-600">{m.rf.slice(3)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 bg-[#050b18]">
        <header className="border-b border-[#1c2a4a] bg-[#080e1f]/95 backdrop-blur sticky top-0 z-10">
          <div className="px-4 py-3 flex items-center gap-3">
            <Link href="/console" className="lg:hidden font-bold text-white text-sm">OmniComm <span className="text-sky-400">360°</span></Link>
            <div className="ml-auto flex items-center gap-3">
              <PushNotifications userId={session.uid} />
              <Link href="/docs" className="text-xs text-slate-400 hover:text-white">Docs API</Link>
              <span className="text-xs text-slate-400">{session.nom} · <span className="text-sky-300">{session.role}</span></span>
              <form action={seDeconnecter}>
                <button className="text-xs border border-[#1c2a4a] hover:border-rose-500/50 text-slate-300 rounded-md px-2.5 py-1 cursor-pointer">Déconnexion</button>
              </form>
            </div>
          </div>
          <div className="lg:hidden px-4 pb-2 overflow-x-auto flex gap-2">
            {COMMERCIAL.map((m) => (
              <Link key={m.href} href={m.href} className="text-[11px] whitespace-nowrap border border-[#1c2a4a] rounded-full px-2.5 py-1 text-slate-300">{m.label.replace(/^[^ ]+ /, "")}</Link>
            ))}
            {DOMAINES.flatMap((d) => d.modules).map((m) => (
              <Link key={m.rf} href={m.href} className="text-[11px] whitespace-nowrap border border-[#1c2a4a] rounded-full px-2.5 py-1 text-slate-300">{m.rf} {m.titre.split(" ")[0]}</Link>
            ))}
            <Link href="/console/historique" className="text-[11px] whitespace-nowrap border border-[#1c2a4a] rounded-full px-2.5 py-1 text-slate-300">Historique</Link>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 bg-[#050b18]">
          <BandeauPasserelle />
          {children}
        </main>
      </div>
    </div>
  );
}
