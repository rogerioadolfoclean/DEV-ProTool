export default function Home() {
  return (
    <main style={{fontFamily:'Arial,sans-serif',padding:40,maxWidth:1100,margin:'auto'}}>
      <header><p>WORKAI 360°</p><h1>Build better careers. Hire smarter.</h1><p>AI-powered recruitment, skills matching and personalized learning.</p></header>
      <section style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20,marginTop:40}}>
        <article><h2>For Candidates</h2><p>Create your profile, showcase skills and discover relevant opportunities.</p></article>
        <article><h2>For Employers</h2><p>Publish jobs and find candidates ranked by skills and fit.</p></article>
        <article><h2>AI Career Paths</h2><p>Turn missing skills into personalized learning actions.</p></article>
      </section>
    </main>
  )
}
