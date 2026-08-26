import { getSession } from '@/lib/auth'

export default async function DashboardPage() {
  const session = await getSession()
  return <main style={{fontFamily:'Arial',padding:40,maxWidth:1200,margin:'auto'}}>
    <h1>WorkAI 360° Dashboard</h1>
    <p>{session ? 'Authenticated workspace.' : 'Please sign in to access your workspace.'}</p>
    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginTop:24}}>
      <section><b>Candidate</b><p>Profile, skills, applications and career paths.</p></section>
      <section><b>Employer</b><p>Companies, jobs, candidates and recruitment pipeline.</p></section>
      <section><b>Admin</b><p>Users, audit and platform analytics.</p></section>
    </div>
  </main>
}
