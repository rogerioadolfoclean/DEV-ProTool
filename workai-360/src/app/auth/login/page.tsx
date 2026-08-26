'use client'
import { FormEvent, useState } from 'react'

export default function LoginPage() {
  const [language,setLanguage]=useState('en'); const [email,setEmail]=useState(''); const [message,setMessage]=useState('')
  async function submit(e:FormEvent){e.preventDefault(); setMessage('Authentication API will validate this account against PostgreSQL.')}
  return <main style={{maxWidth:520,margin:'60px auto',padding:30,fontFamily:'Arial'}}>
    <h1>WorkAI 360°</h1><h2>{language==='en'?'Sign in':'Connexion'}</h2>
    <select value={language} onChange={e=>setLanguage(e.target.value)}><option value="en">English</option><option value="fr">Français</option><option value="es">Español</option><option value="pt">Português</option></select>
    <form onSubmit={submit} style={{display:'grid',gap:14,marginTop:25}}><input required type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}/><input required type="password" placeholder="Password"/><button type="submit">Sign in</button></form>
    {message&&<p>{message}</p>}
  </main>
}
