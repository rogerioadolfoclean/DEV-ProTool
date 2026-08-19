import { exigerSession } from "@/lib/auth";
export default async function RendezVousPage(){await exigerSession();return <section className="space-y-4"><h1 className="text-3xl font-bold">Rendez-vous</h1><p className="text-slate-400">Planification, suivi et historique des rendez-vous commerciaux.</p></section>}
