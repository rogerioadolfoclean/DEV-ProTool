"use client";
import Link from "next/link";

/* Manuel Pratique Rapide — OmniComm 360°.
   Police Courier New taille 18 (règle manuels). Style « papier » pour lecture + impression PDF.
   Exemples RÉELS, pas à pas. Valeurs concrètes (numéro Twilio réel, flux Zeno réel, API réelle). */

type Scenario = {
  n: string;
  titre: string;
  ou: string;
  objectif: string;
  etapes: string[];
  resultat: string;
  astuce?: string;
  reel: "reel" | "twilio" | "cle";
};

const SCENARIOS: Scenario[] = [
  {
    n: "0",
    titre: "Se connecter à la console",
    ou: "omnicomm-360.vercel.app/connexion",
    objectif: "Entrer dans la plateforme et arriver sur le Tableau de bord.",
    reel: "reel",
    etapes: [
      "Ouvrir omnicomm-360.vercel.app/connexion dans le navigateur.",
      "Saisir votre e-mail (ex. rogerioadolfoclean@gmail.com) et votre mot de passe.",
      "Cliquer sur « Se connecter ».",
    ],
    resultat: "Vous arrivez directement sur le Tableau de bord (Vue d'ensemble) avec les chiffres réels de votre compte.",
    astuce: "Chaque connexion ET déconnexion est enregistrée (heure + IP) dans le journal d'audit.",
  },
  {
    n: "1",
    titre: "Envoyer un vrai SMS (rappel de rendez-vous)",
    ou: "Console → SMS (RF-001)",
    objectif: "Prévenir un client que son rendez-vous est demain.",
    reel: "twilio",
    etapes: [
      "Menu de gauche → « SMS ».",
      "Dans « Envoyer un message » : Canal = SMS, Catégorie = Transactionnel.",
      "Destinataire : +243811234567 (format international, indispensable).",
      "Contenu : « Bonjour M. Kabuya, rappel : votre RDV est demain à 10h. — Clinique Lumière ».",
      "Cliquer « Envoyer via la plateforme → ».",
    ],
    resultat:
      "Le message part réellement via Twilio (+18126055553). Il apparaît dans l'historique avec le statut « livré », l'opérateur choisi automatiquement (Least-Cost), le coût et un CDR.",
    astuce:
      "Transactionnel = jamais bloqué. Marketing = vérifié contre la liste « Ne pas déranger » (voir scénario 5).",
  },
  {
    n: "2",
    titre: "Envoyer un message WhatsApp",
    ou: "Console → WhatsApp",
    objectif: "Envoyer une confirmation de commande sur WhatsApp.",
    reel: "twilio",
    etapes: [
      "Menu → « WhatsApp ».",
      "Destinataire : +243811234567.",
      "Contenu : « Votre commande #1042 est confirmée. Livraison prévue vendredi. Merci ! ».",
      "Cliquer « Envoyer via la plateforme → ».",
    ],
    resultat:
      "Le message est envoyé via la passerelle. Statut, coût et horodatage s'affichent dans l'historique WhatsApp.",
    astuce: "Le destinataire doit avoir un compte WhatsApp actif sur ce numéro.",
  },
  {
    n: "3",
    titre: "Passer un appel vocal sortant",
    ou: "Console → Appels Entrants/Sortants (RF-007)",
    objectif: "Appeler un client et lui diffuser un message vocal.",
    reel: "twilio",
    etapes: [
      "Menu → « Appels Entrants/Sortants ».",
      "Numéro à appeler : +243811234567.",
      "Type : Standard.",
      "Message : « Bonjour, votre colis est disponible au point de retrait. ».",
      "Cliquer « Lancer l'appel ».",
    ],
    resultat:
      "L'appel est lancé via Twilio. Son statut (en cours / terminé), sa durée et un CDR apparaissent dans l'historique des appels.",
    astuce: "Commencez toujours par UN seul appel de test avant une campagne d'appels.",
  },
  {
    n: "4",
    titre: "Créer et planifier une campagne marketing",
    ou: "Console → Campagnes",
    objectif: "Envoyer une promo SMS à toute une liste, à une date choisie.",
    reel: "twilio",
    etapes: [
      "Menu → « Campagnes » → « Créer une campagne ».",
      "Nom : « Promo Rentrée Septembre ».",
      "Canal : SMS. Catégorie : Marketing.",
      "Contenu : « -20% sur tout le magasin jusqu'à dimanche ! STOP au 8080 pour ne plus recevoir. ».",
      "Date de planification : choisir jour + heure (ex. demain 09h00). Laisser vide = brouillon.",
      "Cliquer « Créer ».",
    ],
    resultat:
      "La campagne est enregistrée avec le statut « planifiée » (ou « brouillon »). Vous pouvez ensuite la démarrer, la mettre en pause ou l'annuler.",
    astuce:
      "En Marketing, tout destinataire inscrit « Ne pas déranger » est automatiquement écarté (statut « rejeté DND »). C'est la loi.",
  },
  {
    n: "5",
    titre: "Respecter un désabonnement (Ne pas déranger)",
    ou: "Console → Conformité DND, Opt-in/Opt-out (RF-006)",
    objectif: "Un client a répondu STOP : ne plus jamais lui envoyer de marketing.",
    reel: "reel",
    etapes: [
      "Menu → « Conformité DND ».",
      "Canal : SMS.",
      "Identifiant : +243811234567.",
      "Cliquer « Ajouter à la liste DND ».",
    ],
    resultat:
      "Le numéro est ajouté. Désormais, toute campagne Marketing vers ce numéro est bloquée et tracée « rejeté DND ». Les messages transactionnels (rappels, sécurité) restent autorisés.",
    astuce: "Pour ré-autoriser un client qui redemande vos offres : bouton « Retirer » sur la ligne concernée.",
  },
  {
    n: "6",
    titre: "Mettre une radio web en ligne et vérifier le direct",
    ou: "Console → Radio Web & Podcast (RF-010)",
    objectif: "Diffuser votre webradio et confirmer qu'elle est réellement en ondes.",
    reel: "reel",
    etapes: [
      "Menu → « Radio Web & Podcast » → « Créer un flux de streaming ».",
      "Nom : « Radio Congo Web ». Type : Radio. Protocole : Icecast.",
      "Adresse serveur : link.zeno.fm. Port : 80.",
      "Mount : 2rhg5756d8zuv/source. Utilisateur : source. Mot de passe : (cliquer 🔄 pour générer).",
      "URL d'écoute publique : https://stream.zeno.fm/2rhg5756d8zuv.",
      "Cliquer « 🎙 Créer le flux », puis sur la carte du flux cliquer « 🔄 Vérifier ».",
    ],
    resultat:
      "Le bouton « Vérifier » interroge RÉELLEMENT le serveur : le statut passe à « en ligne », le titre en cours de diffusion s'affiche (ex. « Radio Gospel Dieu Provera ») et l'heure de vérification est enregistrée.",
    astuce:
      "Le nombre d'auditeurs s'affiche seulement si le serveur l'expose (Icecast/Shoutcast). Zeno.fm ne le donne pas : on montre l'état réel sans inventer de chiffre.",
  },
  {
    n: "7",
    titre: "Diagnostiquer une carte SIM IoT",
    ou: "Console → Gestion des SIM M2M/IoT (RF-012)",
    objectif: "Savoir si un capteur sur le terrain communique encore.",
    reel: "reel",
    etapes: [
      "Menu → « Gestion des SIM M2M/IoT ».",
      "Repérer la SIM (ex. « Capteur humidité — Kabare P12 »).",
      "Cliquer « Diagnostiquer ».",
    ],
    resultat:
      "Le diagnostic est calculé sur les VRAIES données : statut, dernier trafic et volume data du mois. Exemple réel : « Active mais silencieuse depuis 1444 h (83,2 Mo ce mois-ci) ». Il apparaît dans le journal d'événements de la SIM.",
    astuce:
      "Les mesures radio (dBm / latence) sont marquées « indisponible » tant qu'une sonde matérielle n'est pas branchée — on ne fabrique aucun chiffre.",
  },
  {
    n: "8",
    titre: "Attribuer un numéro virtuel",
    ou: "Console → Numéros Virtuels (RF-015)",
    objectif: "Réserver un numéro pour votre service client.",
    reel: "reel",
    etapes: [
      "Menu → « Numéros Virtuels ».",
      "Choisir un numéro « disponible » dans la liste.",
      "Cliquer « Attribuer ».",
    ],
    resultat:
      "Le numéro passe au statut « attribué » et vous est rattaché. Le bouton « Libérer » le remet à disposition à tout moment.",
    astuce: "Un numéro « local » rassure vos clients ; un numéro « gratuit » (toll-free) est idéal pour le support.",
  },
  {
    n: "9",
    titre: "Créer une clé API et envoyer un SMS par programmation",
    ou: "Console → Portail du Développeur (RF-016)",
    objectif: "Faire envoyer des SMS par votre propre site/logiciel.",
    reel: "cle",
    etapes: [
      "Menu → « Portail du Développeur » → « Nouvelle clé ».",
      "Nom : « Site e-commerce ». Environnement : Production. Cliquer « Créer ».",
      "COPIER la clé affichée (omni_live_…) — elle ne s'affiche qu'UNE fois.",
      "Depuis votre serveur, appeler l'API (exemple ci-dessous).",
    ],
    resultat:
      "curl -X POST https://omnicomm-360.vercel.app/api/v1/messages \\  -H \"Authorization: Bearer omni_live_VOTRECLE\" \\  -H \"Content-Type: application/json\" \\  -d '{\"canal\":\"sms\",\"vers\":\"+243811234567\",\"contenu\":\"Commande expédiée !\"}'  →  le SMS part et l'appel est facturé/tracé comme dans la console.",
    astuce: "Si une clé fuite : bouton « Révoquer ». Ne mettez JAMAIS une clé dans du code public ou un navigateur.",
  },
  {
    n: "10",
    titre: "Brancher un webhook (recevoir les événements)",
    ou: "Console → Webhooks (RF-021)",
    objectif: "Être prévenu automatiquement quand un message est livré.",
    reel: "reel",
    etapes: [
      "Menu → « Webhooks ».",
      "URL : https://votre-site.com/hooks/omnicomm (doit commencer par https://).",
      "Événements : message.livre, message.echoue.",
      "Cliquer « Créer le webhook ».",
    ],
    resultat:
      "OmniComm enverra une requête signée (secret whsec_…) à votre URL à chaque événement. Le bouton bascule active/désactive le webhook.",
    astuce: "Vérifiez la signature côté serveur pour être sûr que l'appel vient bien d'OmniComm.",
  },
  {
    n: "11",
    titre: "Suivre la facturation et la consommation",
    ou: "Console → Facturation",
    objectif: "Voir combien vous avez dépensé ce mois-ci.",
    reel: "reel",
    etapes: [
      "Menu → « Facturation ».",
      "Lire les compteurs d'usage (messages, appels, data) et les factures.",
      "Filtrer par période si besoin.",
    ],
    resultat: "Vous voyez la consommation réelle agrégée depuis les CDR : volumes, coûts cumulés et état des factures.",
    astuce: "Le paiement en ligne (Stripe) s'active dès qu'une clé Stripe est configurée ; sinon les montants restent en suivi.",
  },
  {
    n: "12",
    titre: "Exporter l'historique en CSV",
    ou: "Console → Historique universel / CDR",
    objectif: "Sortir la liste des envois pour la comptabilité.",
    reel: "reel",
    etapes: [
      "Menu → « Historique universel » (ou « CDR »).",
      "Filtrer par canal, période et statut.",
      "Cliquer sur l'export CSV quand il est proposé.",
    ],
    resultat: "Un fichier CSV réel (issu de la base) se télécharge, prêt pour Excel ou votre comptable.",
    astuce: "Filtrez sur « livré » pour ne garder que les envois réellement aboutis.",
  },
  {
    n: "13",
    titre: "Gérer les rôles et la sécurité",
    ou: "Console → Tenants / Administration",
    objectif: "Donner les bons droits à chaque collaborateur.",
    reel: "reel",
    etapes: [
      "Rôles disponibles : admin (tout), tenant_admin (son entreprise), developer (API), viewer (lecture seule).",
      "Un « viewer » ne peut RIEN modifier (aucun envoi, aucune suppression).",
      "Ne jamais partager DATABASE_URL, les clés Twilio ni les clés API.",
    ],
    resultat: "Chaque action sensible est tracée dans le journal d'audit (qui, quoi, quand, IP).",
    astuce: "Pour un stagiaire ou un observateur : donnez le rôle « viewer ».",
  },
];

const BADGE: Record<Scenario["reel"], { txt: string; bg: string }> = {
  reel: { txt: "100% RÉEL", bg: "#1b7a3d" },
  twilio: { txt: "RÉEL via TWILIO", bg: "#1d5fa8" },
  cle: { txt: "RÉEL (clé requise)", bg: "#8a5a00" },
};

export default function GuidePratique() {
  return (
    <main className="gp">
      <style>{`
        .gp{font-family:"Courier New",Courier,monospace;font-size:18px;line-height:1.55;
            color:#1a1a1a;background:#f6f3ea;min-height:100vh;padding:28px 16px;}
        .gp *{font-family:"Courier New",Courier,monospace;}
        .gp .sheet{max-width:900px;margin:0 auto;background:#fffdf7;border:1px solid #d8d2c0;
            border-radius:10px;padding:32px 34px;box-shadow:0 8px 30px rgba(0,0,0,.12);}
        .gp h1{font-size:26px;margin:0 0 4px;}
        .gp .sub{font-size:16px;color:#555;margin:0 0 18px;}
        .gp .bar{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 22px;}
        .gp .bar button,.gp .bar a{font-size:15px;border:1px solid #b9b199;background:#efe9d6;
            color:#1a1a1a;border-radius:6px;padding:7px 12px;cursor:pointer;text-decoration:none;}
        .gp .intro{background:#eef4ee;border:1px solid #cfe0cf;border-radius:8px;padding:14px 16px;margin-bottom:24px;font-size:16px;}
        .gp .legend{font-size:14px;color:#444;margin:10px 0 0;}
        .gp .badge{display:inline-block;color:#fff;font-size:12px;font-weight:bold;
            border-radius:5px;padding:3px 8px;vertical-align:middle;margin-left:8px;}
        .gp article{border-top:2px dashed #ddd6c2;padding:22px 0 6px;}
        .gp h2{font-size:20px;margin:0 0 2px;}
        .gp .ou{font-size:14px;color:#7a5b00;margin:0 0 10px;}
        .gp .obj{margin:0 0 10px;}
        .gp ol{margin:0 0 12px;padding-left:26px;}
        .gp ol li{margin:0 0 6px;}
        .gp .res{background:#f0f5fb;border-left:4px solid #1d5fa8;padding:10px 14px;margin:0 0 10px;
            white-space:pre-wrap;word-break:break-word;}
        .gp .tip{background:#fbf6e8;border-left:4px solid #caa53a;padding:9px 14px;font-size:16px;}
        .gp .check{margin-top:26px;background:#eef4ee;border:1px solid #cfe0cf;border-radius:8px;padding:16px 18px;}
        .gp .check h2{margin-top:0;}
        .gp footer{margin-top:26px;border-top:1px solid #ddd6c2;padding-top:14px;font-size:14px;color:#555;text-align:center;}
        @media print{.gp{background:#fff;padding:0;} .gp .sheet{box-shadow:none;border:none;max-width:none;} .gp .bar{display:none;}}
      `}</style>

      <div className="sheet">
        <h1>📘 Manuel Pratique Rapide — OmniComm 360°</h1>
        <p className="sub">Guide pas à pas, avec des exemples réels de la vie de tous les jours.</p>

        <div className="bar">
          <button onClick={() => window.print()}>🖨 Imprimer / Enregistrer en PDF</button>
          <Link href="/console">← Tableau de bord</Link>
          <Link href="/manuel">Manuel de référence</Link>
        </div>

        <div className="intro">
          <b>Comment lire ce guide :</b> chaque fiche donne l&apos;<b>objectif</b>, les <b>étapes</b> exactes à cliquer,
          le <b>résultat attendu</b>, puis une <b>astuce</b>. Les valeurs (numéros, adresses) sont des exemples
          concrets — remplacez-les par les vôtres.
          <div className="legend">
            Légende de fiabilité :
            <span className="badge" style={{ background: BADGE.reel.bg }}>{BADGE.reel.txt}</span>
            <span className="badge" style={{ background: BADGE.twilio.bg }}>{BADGE.twilio.txt}</span>
            <span className="badge" style={{ background: BADGE.cle.bg }}>{BADGE.cle.txt}</span>
          </div>
        </div>

        {SCENARIOS.map((s) => (
          <article key={s.n}>
            <h2>
              {s.n === "0" ? "▶" : `${s.n}.`} {s.titre}
              <span className="badge" style={{ background: BADGE[s.reel].bg }}>{BADGE[s.reel].txt}</span>
            </h2>
            <p className="ou">📍 {s.ou}</p>
            <p className="obj">🎯 <b>Objectif :</b> {s.objectif}</p>
            <ol>{s.etapes.map((e, i) => <li key={i}>{e}</li>)}</ol>
            <div className="res">✅ <b>Résultat :</b> {s.resultat}</div>
            {s.astuce && <div className="tip">💡 <b>Astuce :</b> {s.astuce}</div>}
          </article>
        ))}

        <div className="check">
          <h2>✔ Check-list avant une grande campagne</h2>
          <p>☐ Numéros au format international &nbsp; ☐ Message relu &nbsp; ☐ Catégorie correcte (transac./marketing)</p>
          <p>☐ Liste DND à jour &nbsp; ☐ UN appel/SMS de test fait &nbsp; ☐ Résultat vérifié dans l&apos;historique</p>
          <p>☐ Rôles vérifiés &nbsp; ☐ Clés API jamais exposées</p>
        </div>

        <footer>
          OmniComm 360° — plateforme CPaaS · Édité par <b>Devaryx-Kernel Software</b>, Rio de Janeiro (Brésil)
          · +55 (21) 99064-5151
        </footer>
      </div>
    </main>
  );
}
