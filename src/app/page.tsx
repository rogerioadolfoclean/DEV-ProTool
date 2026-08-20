"use client";

import { useMemo, useState } from "react";

type Call = { id:number; client:string; campaign:string; status:"Réussi"|"En cours"|"En attente"|"Échec"; duration:string; time:string };

const calls:Call[] = [
  {id:1,client:"Jean Mukendi",campaign:"Rappel RDV",status:"En cours",duration:"02:34",time:"Il y a 3 min"},
  {id:2,client:"Marie-Louise K.",campaign:"Offre Spéciale",status:"Réussi",duration:"04:18",time:"Il y a 8 min"},
  {id:3,client:"Paul Tshibangu",campaign:"Enquête Client",status:"En attente",duration:"—",time:"Il y a 15 min"},
  {id:4,client:"Sophie Lumbu",campaign:"Rappel RDV",status:"Réussi",duration:"03:42",time:"Il y a 22 min"},
  {id:5,client:"Alain Banza",campaign:"Offre Spéciale",status:"Échec",duration:"01:28",time:"Il y a 32 min"},
];

const nav = [
  ["Vue d'ensemble","/"],["Campagnes","/campagnes"],["Listes d'appels","/listes-appels"],["Auto-Dialer","/auto-dialer"],["File d'appels","/file-appels"],
  ["Clients CRM","/clients-crm"],["Contacts","/contacts"],["Rendez-vous","/rendez-vous"],["Segments","/segments"],
  ["Appels en cours","/appels-en-cours"],["Historique","/historique-appels"],["Enregistrements","/enregistrements"],["Transcriptions","/transcriptions"],
  ["Rapports","/rapports"],["Statistiques","/statistiques"],["Utilisateurs","/utilisateurs"],["Rôles & Permissions","/roles-permissions"],["Paramètres","/parametres"],["Intégrations","/integrations"],["Logs & Audit","/logs-audit"],
];

export default function Home(){
  const [query,setQuery]=useState("");
  const [range,setRange]=useState("7 jours");
  const [notice,setNotice]=useState("");
  const [selected,setSelected]=useState("Vue d'ensemble");
  const [online,setOnline]=useState(true);
  const filtered=useMemo(()=>calls.filter(c=>`${c.client} ${c.campaign}`.toLowerCase().includes(query.toLowerCase())),[query]);
  const action=(message:string)=>setNotice(message);

  return <main className="omni-app">
    <aside className="omni-sidebar">
      <div className="omni-brand"><div className="omni-logo">∞</div><div><b>OmniComm 360°</b><small>Voice AI + CRM</small></div></div>
      <div className="side-section"><span>PLATEFORME</span>{nav.slice(0,9).map(([label,href],i)=><button key={label} className={selected===label?"side-link active":"side-link"} onClick={()=>{setSelected(label); if(label!=="Vue d'ensemble") window.location.assign(href)}}><i>{["⌂","◇","▣","☎","↻","♙","♧","◷","◉"][i]}</i>{label}</button>)}</div>
      <div className="side-section"><span>OBSERVABILITÉ</span>{nav.slice(9,15).map(([label,href])=><button key={label} className="side-link" onClick={()=>{setSelected(label);window.location.assign(href)}}><i>▤</i>{label}</button>)}</div>
      <div className="side-section"><span>ADMINISTRATION</span>{nav.slice(15).map(([label,href])=><button key={label} className="side-link" onClick={()=>{setSelected(label);window.location.assign(href)}}><i>⚙</i>{label}</button>)}</div>
      <div className="side-bottom"><button onClick={()=>setOnline(!online)}>◐ &nbsp; Mode {online?"opérationnel":"hors ligne"}</button><small>OmniComm 360° Enterprise</small></div>
    </aside>

    <section className="omni-main">
      <header className="omni-topbar"><button className="menu-btn">☰</button><div className="global-search">⌕<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher un client, campagne, service..."/><kbd>⌘ K</kbd></div><div className="top-user"><button onClick={()=>action("12 notifications vérifiées.")}>♧ <b>12</b></button><button onClick={()=>action("Centre d'aide OmniComm 360°")}>?</button><div className="avatar">R</div><div><strong>Rogerio Kabongo</strong><small>Administrateur</small></div><span>⌄</span></div></header>

      <div className="page-head"><div><h1>Bonjour Rogerio !</h1><p>Voici l'état de votre plateforme OmniComm 360° aujourd'hui.</p></div><div className="filters"><select><option>Tous les modules</option><option>Voice AI</option><option>CRM</option><option>Campagnes</option></select><button onClick={()=>action("Période actuelle : 20 mai — 26 mai 2024")}>20 mai — 26 mai 2024　▣</button></div></div>

      <section className="kpi-grid">
        <Kpi title="Appels traités" value="1 248" sub="↑ 12.5% vs semaine dernière" icon="☎" tone="violet"/>
        <Kpi title="Taux de réussite" value="67.6%" sub="↑ 8.2% vs semaine dernière" icon="✓" tone="blue"/>
        <Kpi title="Conversions" value="128" sub="↑ 15.4% cette semaine" icon="◇" tone="green"/>
        <Kpi title="Temps moyen" value="02:48" sub="↓ 14% vs semaine dernière" icon="◷" tone="amber"/>
      </section>

      <div className="dashboard-grid">
        <div className="left-column">
          <section className="panel"><div className="panel-head"><h2>Appels récents</h2><button onClick={()=>window.location.assign("/historique-appels")}>Voir tous</button></div><div className="table"><div className="table-head"><span>STATUT</span><span>CLIENT</span><span>CAMPAGNE</span><span>DURÉE</span><span>ACTIVITÉ</span></div>{filtered.map(c=><div className="table-row" key={c.id}><span><em className={`status ${c.status.replace(" ","-").toLowerCase()}`}>●</em>{c.status}</span><strong>{c.client}</strong><span>{c.campaign}</span><span>{c.duration}</span><span>{c.time}　<button className="mini" onClick={()=>action(`Appel relancé vers ${c.client}.`)}>▶</button></span></div>)}</div></section>

          <section className="bottom-grid"><section className="panel"><div className="panel-head"><h2>Performance Voice AI</h2><button onClick={()=>action("Rapport Voice AI ouvert.")}>Voir le rapport</button></div><div className="chart"><div className="ylabels"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div><svg viewBox="0 0 600 190" preserveAspectRatio="none"><path d="M0 142 C70 85,95 130,145 104 S220 140,275 83 S350 117,405 76 S490 112,550 58 S580 73,600 48"/><path className="line2" d="M0 152 C65 132,100 148,150 126 S220 146,280 119 S355 139,410 111 S490 130,550 91 S585 108,600 83"/></svg><div className="xlabels"><span>Lun</span><span>Mar</span><span>Mer</span><span>Jeu</span><span>Ven</span><span>Sam</span><span>Dim</span></div></div><div className="range"><button className={range==="7 jours"?"selected":""} onClick={()=>setRange("7 jours")}>7 jours</button><button className={range==="30 jours"?"selected":""} onClick={()=>setRange("30 jours")}>30 jours</button><button className={range==="90 jours"?"selected":""} onClick={()=>setRange("90 jours")}>90 jours</button></div></section>
          <section className="panel"><div className="panel-head"><h2>Campagnes actives</h2><button onClick={()=>window.location.assign("/campagnes")}>Voir toutes</button></div>{[["Rappel RDV","72%","1 248 appels"],["Offre Spéciale","45%","842 appels"],["Enquête Client","60%","512 appels"],["Fidélisation","38%","329 appels"]].map(x=><div className="campaign-row" key={x[0]}><div><strong>{x[0]}</strong><small>{x[2]}</small><b>{x[1]}</b></div><div className="bar"><i style={{width:x[1]}}/></div></div>)}</section></section>
        </div>

        <aside className="right-column"><section className="panel quick"><div className="panel-head"><h2>Actions rapides</h2></div><div className="quick-grid">{[["✦","Nouvelle campagne","violet"],["☎","Lancer Auto-Dialer","blue"],["♙","Créer un client","green"],["▤","Voir les rapports","amber"]].map(x=><button key={x[1]} onClick={()=>action(`${x[1]} sélectionné.`)}><i className={x[2]}>{x[0]}</i><span>{x[1]}</span></button>)}</div></section>
          <section className="panel"><div className="panel-head"><h2>Notifications</h2><button onClick={()=>action("Toutes les notifications sont affichées.")}>Voir toutes</button></div><Notice icon="✓" title="Campagne terminée" text="Rappel RDV a atteint son objectif." time="Il y a 8 min" tone="ok"/><Notice icon="!" title="Attention Auto-Dialer" text="7 contacts nécessitent une nouvelle tentative." time="Il y a 32 min" tone="warn"/><Notice icon="i" title="Nouvelle analyse IA" text="Une synthèse de conversion est disponible." time="Il y a 1 h" tone="info"/></section>
          <section className="panel environments"><div className="panel-head"><h2>État des services</h2><button onClick={()=>action("État détaillé des services chargé.")}>Détails</button></div>{[["Voice AI","OpenAI / LLM","Sain"],["Téléphonie","Twilio / SIP","Sain"],["CRM","PostgreSQL","Sain"],["Automations","Workers","Sain"]].map(x=><div className="env" key={x[0]}><span className="service-icon">◈</span><div><strong>{x[0]}</strong><small>{x[1]}</small></div><b>● {x[2]}</b></div>)}</section>
          <section className="panel health"><div className="panel-head"><h2>Santé du système</h2><span className="healthy">● Opérationnel</span></div><strong>99.9%</strong><p>Disponibilité de la plateforme (30 jours)</p><svg viewBox="0 0 600 100" preserveAspectRatio="none"><path d="M0 78 C45 62,75 75,115 58 S170 66,215 49 S275 67,325 44 S380 55,430 32 S500 50,550 22 S580 28,600 14"/></svg><button onClick={()=>action("Statut détaillé : tous les services opérationnels.")}>Voir le statut détaillé →</button></section></aside>
      </div>

      <footer className="omni-footer"><span>✦ Intelligence conversationnelle <small>LLM ready</small></span><span>♬ Reconnaissance vocale <small>Speech-to-text</small></span><span>☎ Téléphonie <small>Twilio / SIP</small></span><span>▤ Données <small>PostgreSQL</small></span><span>♙ Sécurité <small>RBAC + Audit</small></span><small>© 2026 OmniComm 360°</small></footer>
      {notice&&<button className="toast" onClick={()=>setNotice("")}>{notice}　×</button>}
    </section>
  </main>
}

function Kpi({title,value,sub,icon,tone}:{title:string;value:string;sub:string;icon:string;tone:string}){return <div className="kpi"><div><small>{title}</small><strong>{value}</strong><span>{sub}</span></div><i className={tone}>{icon}</i></div>}
function Notice({icon,title,text,time,tone}:{icon:string;title:string;text:string;time:string;tone:string}){return <div className="notice"><i className={tone}>{icon}</i><div><strong>{title}</strong><p>{text}</p></div><small>{time}</small></div>}
