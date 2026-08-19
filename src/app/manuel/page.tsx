"use client";
import Link from "next/link";

const sections=[
["1. Comprendre OmniComm 360 AI","La plateforme regroupe CRM, campagnes, listes d'appels, AutoDialer IA, historique, enregistrements, transcriptions, rapports et administration."],
["2. Ajouter un client","Ouvrir Clients → Nouveau client → saisir nom, téléphone international, e-mail, ville et statut → Ajouter."],
["3. Préparer une campagne","Créer une campagne, sélectionner la liste de téléphones, vérifier les numéros et préparer le scénario vocal."],
["4. AutoDialer IA","Sélectionner un ou plusieurs numéros actifs. Pour le premier test, utiliser un seul numéro puis cliquer sur Lancer."],
["5. Appel répondu","Après réponse, vérifier le statut, la durée, le numéro appelé et l'historique. L'enregistrement dépend de la configuration téléphonique et des règles applicables."],
["6. Numéro, ville et pays","Conserver le numéro au format international et renseigner la ville et le pays pour éviter les ambiguïtés."],
["7. IA / LLM","Les fournisseurs IA configurés peuvent assister l'analyse, la rédaction et la classification. Les clés API restent côté serveur."],
["8. Rapports et CSV","Filtrer les appels par campagne, période et statut puis exporter les résultats lorsque le module le permet."],
["9. Sécurité","Ne jamais exposer DATABASE_URL, clés Twilio ou clés LLM. Utiliser les rôles et permissions pour les opérations sensibles."],
["10. Test professionnel","Toujours commencer par un seul appel, vérifier le résultat dans l'historique, puis seulement lancer une campagne plus large."],
];
export default function Manuel(){return <main className="manuel-page"><div className="manuel-wrap"><header><h1>📘 Manuel d'utilisateur professionnel</h1><p>OmniComm 360 AI — guide pratique étape par étape</p><div className="manuel-actions"><button onClick={()=>window.print()}>🖨 Imprimer / Enregistrer en PDF</button><Link href="/">← Retour au tableau de bord</Link></div></header><section className="manuel-intro"><b>Exemple concret :</b> créer un client, vérifier son téléphone + ville + pays, l'ajouter à une campagne, tester un seul appel AutoDialer IA, puis contrôler le résultat dans l'historique.</section>{sections.map(([title,text])=><article key={title}><h2>{title}</h2><p>{text}</p></article>)}<section className="manuel-check"><h2>Checklist avant une campagne</h2><p>☐ Numéros vérifiés &nbsp; ☐ Ville/pays vérifiés &nbsp; ☐ Campagne prête &nbsp; ☐ Message testé</p><p>☐ Un appel test effectué &nbsp; ☐ Résultat visible dans l'historique &nbsp; ☐ Autorisations vérifiées</p></section></div></main>}
