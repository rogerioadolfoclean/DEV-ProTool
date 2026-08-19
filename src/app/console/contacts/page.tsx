import { exigerSession } from "@/lib/auth";
export default async function ContactsPage(){await exigerSession();return <section className="space-y-4"><h1 className="text-3xl font-bold">Contacts</h1><p className="text-slate-400">Gestion des contacts, coordonnées, consentements et segmentation.</p></section>}
