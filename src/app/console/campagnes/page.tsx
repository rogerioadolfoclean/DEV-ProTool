import Link from "next/link";
import { exigerSession } from "@/lib/auth";

export default async function CampagnesPage() {
  await exigerSession();
  return <section className="space-y-4"><h1 className="text-3xl font-bold">Campagnes</h1><p className="text-slate-400">Création, suivi et pilotage des campagnes omnicanales.</p><Link className="inline-block rounded-lg bg-sky-600 px-4 py-2 font-semibold" href="/console/sms">Créer une campagne SMS</Link></section>;
}
