import { useState, useRef, useEffect } from 'react'
import L from 'leaflet'
import { getOpenJobs, acceptJob } from '../api.js'

L.Icon.Default.imagePath = 'https://unpkg.com/leaflet@1.9.4/dist/images/'

function ProviderDashboard() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markersLayer = useRef(null)

  const loadJobs = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getOpenJobs()
      setJobs(data || [])

      // Update map
      if (mapInstance.current && markersLayer.current) {
        markersLayer.current.clearLayers()

        data.forEach((job) => {
          if (job.latitude && job.longitude) {
            const m = L.marker([job.latitude, job.longitude])
            m.bindPopup(`<strong>${job.title}</strong><br>${job.address || ''}`)
            m.addTo(markersLayer.current)
          }
        })

        if (data.length > 0 && data[0].latitude) {
          mapInstance.current.setView([data[0].latitude, data[0].longitude], 11)
        }
      }
    } catch (e) {
      setError('Could not load jobs. Make sure backend is running (uvicorn on :8000).')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // init map once
    if (!mapInstance.current) {
      const map = L.map(mapRef.current).setView([39.8283, -98.5795], 5)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map)

      markersLayer.current = L.layerGroup().addTo(map)
      mapInstance.current = map
    }

    loadJobs()

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
      }
    }
  }, [])

  const handleAccept = async (jobId) => {
    try {
      await acceptJob(jobId)
      alert('Job accepted!')
      loadJobs()
    } catch {
      alert('Failed to accept job.')
    }
  }

  return (
    <div id="app">
      <div ref={mapRef} id="map" style={{ minHeight: '520px', borderRadius: 24, boxShadow: '0 24px 60px rgba(0,0,0,0.12)' }}></div>

      <div className="sidebar">
        <div className="card">
          <h2 style={{ margin: '0 0 12px' }}>Available jobs</h2>

          {loading && <p className="note">Loading jobs...</p>}
          {error && <p className="note" style={{ color: '#b33' }}>{error}</p>}

          {!loading && jobs.length === 0 && (
            <div className="empty-state">
              <strong>No open jobs available.</strong>
              <br />
              Check back soon for fresh local work.
            </div>
          )}

          {jobs.map((job) => (
            <div key={job.id} className="job-card">
              <h3>{job.title}</h3>
              <p><strong>Urgency:</strong> {job.urgency}</p>
              <p>{job.description}</p>
              <p><strong>Address:</strong> {job.address}</p>
              <p style={{ fontSize: '0.85rem', color: '#666' }}>Status: {job.status}</p>

              <button onClick={() => handleAccept(job.id)}>Accept Job</button>
            </div>
          ))}

          <button
            onClick={loadJobs}
            style={{ marginTop: 12, background: 'transparent', color: '#2e6d34', border: '1px solid #2e6d34' }}
          >
            Refresh jobs
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProviderDashboard
