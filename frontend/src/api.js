const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function postJob(jobData) {
  const res = await fetch(`${API_BASE}/jobs/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(jobData),
  })
  if (!res.ok) throw new Error('Failed to post job')
  return res.json()
}

export async function getOpenJobs() {
  const res = await fetch(`${API_BASE}/jobs/open/`)
  if (!res.ok) throw new Error('Failed to load jobs')
  return res.json()
}

export async function acceptJob(jobId) {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/status/?status=assigned`, {
    method: 'PUT',
  })
  if (!res.ok) throw new Error('Failed to accept job')
  return res.json()
}
