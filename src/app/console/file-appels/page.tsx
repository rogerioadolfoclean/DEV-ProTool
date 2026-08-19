import { exigerSession } from "@/lib/auth";
export default async function FileAppelsPage(){await exigerSession();return <section className="space-y-4"><h1 className="text-3xl font-bold">File d'appels</h1><p className="text-slate-400">File opérationnelle, priorités et statut des appels à traiter.</p></section>}
