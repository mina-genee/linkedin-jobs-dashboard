'use client';

import dynamic from 'next/dynamic';

const Dashboard = dynamic(() => import('./Dashboard'), { 
  ssr: false, 
  loading: () => (
    <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '3rem 1.5rem' }}>
      <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{fontSize: '2.2rem', fontWeight: 600, color: '#111827', marginBottom: '0.5rem'}}>LinkedIn Jobs Dashboard</h1>
        <p style={{color: '#6b7280', fontSize: '1rem'}}>Real-time dynamic scraping via CheerIO & Next.js API Routes</p>
      </header>
      <div style={{ textAlign: 'center', marginTop: '4rem', color: '#6b7280', fontFamily: 'sans-serif' }}>
         Loading dashboard architecture...
      </div>
    </main>
  )
});

export default function Page() {
  return <Dashboard />;
}
