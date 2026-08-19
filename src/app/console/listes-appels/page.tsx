import { exigerSession } from "@/lib/auth";
export default async function ListesAppelsPage(){await exigerSession();return <section className="space-y-4"><h1 className="text-3xl font-bold">Listes d'appels</h1><p className="text-slate-400">Importation, segmentation et préparation des contacts pour les appels.</p></section>}
