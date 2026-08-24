"use client";
import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Client={id:number;external_id:string;name:string;phone:string;email?:string;city?:string;status:string;last_contact_at?:string};

const STATUTS:Record<string,{label:string;dot:string;chip:string}>={
 active:{label:"Actif",dot:"bg-emerald-400",chip:"border-emerald-500/30 bg-emerald-500/10 text-emerald-300"},
 inactive:{label:"Inactif",dot:"bg-slate-400",chip:"border-slate-500/30 bg-slate-500/10 text-slate-300"},
 blocked:{label:"Bloqué",dot:"bg-rose-400",chip:"border-rose-500/30 bg-rose-500/10 text-rose-300"},
};
const initiales=(n:string)=>n.trim().split(/\s+/).slice(0,2).map(w=>w[0]?.toUpperCase()||"").join("")||"?";
const inputCls="w-full rounded-lg bg-[#050b18] border border-[#1c2a4a] px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-sky-500/60 focus:ring-2 focus:ring-sky-500/20 transition";

export default function ClientsPage(){
 const [clients,setClients]=useState<Client[]>([]),[q,setQ]=useState(""),[name,setName]=useState(""),[phone,setPhone]=useState(""),[email,setEmail]=useState(""),[city,setCity]=useState(""),[status,setStatus]=useState("active"),[editing,setEditing]=useState<Client|null>(null),[notice,setNotice]=useState(""),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false);
 const load=(query=q)=>{setLoading(true);return fetch(`/api/clients?q=${encodeURIComponent(query)}`).then(r=>r.json()).then(x=>setClients(x.data||[])).catch(()=>setNotice("Impossible de charger les clients.")).finally(()=>setLoading(false))};
 useEffect(()=>{load("")},[]);// eslint-disable-line react-hooks/exhaustive-deps
 const reset=()=>{setName("");setPhone("");setEmail("");setCity("");setStatus("active");setEditing(null)};
 const save=async(e:FormEvent)=>{e.preventDefault();setSaving(true);const url=editing?`/api/clients/${editing.id}`:"/api/clients";const method=editing?"PATCH":"POST";try{const r=await fetch(url,{method,headers:{"content-type":"application/json"},body:JSON.stringify({name,phone,email,city,status})});const x=await r.json();if(!r.ok){setNotice(x.error||"Erreur");return}setNotice(editing?"Client modifié avec succès.":"Client créé avec succès.");reset();load()}finally{setSaving(false)}};
 const edit=(c:Client)=>{setEditing(c);setName(c.name);setPhone(c.phone);setEmail(c.email||"");setCity(c.city||"");setStatus(c.status||"active");window.scrollTo({top:0,behavior:"smooth"})};
 const remove=async(c:Client)=>{if(!confirm(`Supprimer ${c.name} ?`))return;const r=await fetch(`/api/clients/${c.id}`,{method:"DELETE"});const x=await r.json();setNotice(r.ok?"Client supprimé.":(x.error||"Suppression impossible"));if(r.ok)load()};
 const stats=useMemo(()=>({total:clients.length,actifs:clients.filter(c=>c.status==="active").length,bloques:clients.filter(c=>c.status==="blocked").length}),[clients]);

 return <main className="min-h-screen bg-[#050b18] text-slate-100">
  <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
   {/* En-tête */}
   <header className="flex flex-wrap items-center justify-between gap-4 mb-6">
    <div>
     <div className="text-[11px] font-mono uppercase tracking-wider text-sky-400">OmniComm 360° · CRM</div>
     <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">♙ Clients</h1>
     <p className="text-sm text-slate-400 mt-0.5">Gestion de la relation client — base réelle connectée à PostgreSQL</p>
    </div>
    <Link href="/console" className="shrink-0 rounded-lg bg-sky-600 hover:bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition">← Tableau de bord</Link>
   </header>

   {/* KPIs */}
   <div className="grid grid-cols-3 gap-3 mb-6">
    {[["Total clients",stats.total,"text-white"],["Actifs",stats.actifs,"text-emerald-400"],["Bloqués",stats.bloques,"text-rose-400"]].map(([l,v,c])=>(
     <div key={l as string} className="rounded-xl border border-[#1c2a4a] bg-[#080e1f] px-4 py-3">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{l}</div>
      <div className={`text-2xl font-bold ${c}`}>{v}</div>
     </div>
    ))}
   </div>

   {/* Formulaire */}
   <section className="rounded-xl border border-[#1c2a4a] bg-[#080e1f] p-5 mb-5">
    <div className="flex items-center justify-between mb-4">
     <h2 className="text-sm font-semibold text-white">{editing?"✏️ Modifier le client":"➕ Nouveau client"}</h2>
     {editing&&<span className="text-[11px] rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-300 px-2.5 py-1">Édition · {editing.external_id}</span>}
    </div>
    <form onSubmit={save} className="space-y-4">
     <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <div><label className="text-xs text-slate-400">Nom complet</label><input className={`mt-1 ${inputCls}`} placeholder="Ex. Marie-Louise K." value={name} onChange={e=>setName(e.target.value)} required/></div>
      <div><label className="text-xs text-slate-400">Téléphone</label><input className={`mt-1 ${inputCls}`} placeholder="+243 …" value={phone} onChange={e=>setPhone(e.target.value)} required/></div>
      <div><label className="text-xs text-slate-400">E-mail</label><input type="email" className={`mt-1 ${inputCls}`} placeholder="client@domaine.cd" value={email} onChange={e=>setEmail(e.target.value)}/></div>
      <div><label className="text-xs text-slate-400">Ville</label><input className={`mt-1 ${inputCls}`} placeholder="Kinshasa" value={city} onChange={e=>setCity(e.target.value)}/></div>
      <div><label className="text-xs text-slate-400">Statut</label><select className={`mt-1 ${inputCls}`} value={status} onChange={e=>setStatus(e.target.value)}><option value="active">Actif</option><option value="inactive">Inactif</option><option value="blocked">Bloqué</option></select></div>
     </div>
     <div className="flex items-center gap-3">
      <button disabled={saving} className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-5 py-2.5 text-sm font-bold text-white transition">{saving?"…":editing?"💾 Enregistrer":"➕ Ajouter"}</button>
      {editing&&<button type="button" onClick={reset} className="rounded-lg border border-[#1c2a4a] hover:bg-white/5 px-4 py-2.5 text-sm text-slate-300 transition">Annuler</button>}
     </div>
    </form>
   </section>

   {/* Recherche + tableau */}
   <section className="rounded-xl border border-[#1c2a4a] bg-[#080e1f] overflow-hidden">
    <div className="flex flex-wrap items-center gap-3 p-4 border-b border-[#1c2a4a]">
     <div className="relative flex-1 min-w-[200px]">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">⌕</span>
      <input className={`${inputCls} pl-8`} placeholder="Rechercher par nom, téléphone, e-mail…" value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&load()}/>
     </div>
     <button onClick={()=>load()} className="rounded-lg bg-sky-600 hover:bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition">Rechercher</button>
     <a href="/api/export/calls" className="rounded-lg border border-[#1c2a4a] hover:bg-white/5 px-4 py-2.5 text-sm text-slate-300 transition">⭳ CSV appels</a>
    </div>
    <div className="overflow-x-auto">
     <table className="w-full text-sm">
      <thead>
       <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500">
        {["Client","Téléphone","E-mail","Ville","Statut","Dernier contact","Actions"].map(h=><th key={h} className="px-4 py-3 font-medium border-b border-[#1c2a4a] whitespace-nowrap">{h}</th>)}
       </tr>
      </thead>
      <tbody>
       {loading?(
        <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-500">Chargement…</td></tr>
       ):clients.length?clients.map(c=>{const s=STATUTS[c.status]||STATUTS.inactive;return(
        <tr key={c.id} className="hover:bg-sky-500/5 transition">
         <td className="px-4 py-3 border-b border-[#0f1a30]">
          <div className="flex items-center gap-2.5">
           <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-sky-500/30 to-violet-500/30 text-xs font-bold text-sky-200">{initiales(c.name)}</span>
           <div><div className="font-medium text-white">{c.name}</div><div className="text-[11px] font-mono text-slate-600">{c.external_id}</div></div>
          </div>
         </td>
         <td className="px-4 py-3 border-b border-[#0f1a30] text-slate-300 whitespace-nowrap">{c.phone}</td>
         <td className="px-4 py-3 border-b border-[#0f1a30] text-slate-400">{c.email||"—"}</td>
         <td className="px-4 py-3 border-b border-[#0f1a30] text-slate-400">{c.city||"—"}</td>
         <td className="px-4 py-3 border-b border-[#0f1a30]"><span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] ${s.chip}`}><span className={`h-1.5 w-1.5 rounded-full ${s.dot}`}/>{s.label}</span></td>
         <td className="px-4 py-3 border-b border-[#0f1a30] text-slate-400 whitespace-nowrap">{c.last_contact_at?new Date(c.last_contact_at).toLocaleString("fr-FR"):"—"}</td>
         <td className="px-4 py-3 border-b border-[#0f1a30] whitespace-nowrap">
          <button onClick={()=>edit(c)} className="mr-2 rounded-md border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 px-2.5 py-1.5 text-xs text-sky-300 transition">Modifier</button>
          <button onClick={()=>remove(c)} className="rounded-md border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 px-2.5 py-1.5 text-xs text-rose-300 transition">Supprimer</button>
         </td>
        </tr>
       )}):(
        <tr><td colSpan={7} className="px-4 py-16 text-center">
         <div className="text-4xl mb-2">🗂️</div>
         <div className="text-slate-300 font-medium">Aucun client trouvé</div>
         <div className="text-sm text-slate-500 mt-1">Ajoutez votre premier client avec le formulaire ci-dessus.</div>
        </td></tr>
       )}
      </tbody>
     </table>
    </div>
   </section>
  </div>

  {notice&&<button onClick={()=>setNotice("")} className="fixed bottom-5 right-5 z-50 rounded-lg border border-[#1c2a4a] bg-[#0f1a30] px-4 py-3 text-sm text-white shadow-lg shadow-black/40 hover:bg-[#16233f] transition">{notice} <span className="text-slate-500">×</span></button>}
 </main>;
}
