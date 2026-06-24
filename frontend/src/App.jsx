import { useState } from 'react'
import JobPostForm from './components/JobPostForm.jsx'
import ProviderDashboard from './components/ProviderDashboard.jsx'

function App() {
  const [tab, setTab] = useState('post') // 'post' | 'dashboard'

  return (
    <>
      <header>
        <div className="top-links">
          <button onClick={() => setTab('post')}>Post a job</button>
          <button onClick={() => setTab('dashboard')}>Provider dashboard</button>
        </div>
        <h1>Black Rabbit</h1>
        <p className="subtitle">
          Marketplace connecting customers with local landscaping and lawn care providers.
        </p>
      </header>

      <main>
        {tab === 'post' ? <JobPostForm /> : <ProviderDashboard />}
      </main>

      <footer style={{ textAlign: 'center', padding: '40px 20px', color: '#556d58', fontSize: '0.9rem' }}>
        Black Rabbit Landscaping • React + FastAPI
      </footer>
    </>
  )
}

export default App
