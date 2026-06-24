import { useState, useRef, useEffect } from 'react'
import L from 'leaflet'
import { postJob } from '../api.js'

// Fix default marker icon paths for Leaflet in Vite
L.Icon.Default.imagePath = 'https://unpkg.com/leaflet@1.9.4/dist/images/'

function JobPostForm() {
  const [form, setForm] = useState({
    title: '',
    description: '',
    service_type: 'Lawn Care',
    urgency: 'Today',
    address: '',
  })
  const [coords, setCoords] = useState(null)
  const [status, setStatus] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markerRef = useRef(null)

  useEffect(() => {
    if (mapInstance.current) return

    const map = L.map(mapRef.current).setView([39.8283, -98.5795], 4)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)

    map.on('click', (e) => {
      const { lat, lng } = e.latlng
      setCoords({ lat, lng })

      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng])
      } else {
        markerRef.current = L.marker([lat, lng]).addTo(map)
      }
    })

    mapInstance.current = map

    // Try to center on user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        map.setView([pos.coords.latitude, pos.coords.longitude], 12)
      })
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
      }
    }
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title || !form.description || !form.address) {
      setStatus('Please fill out all required fields.')
      return
    }

    setSubmitting(true)
    setStatus('')

    try {
      const body = {
        ...form,
        customer_id: 1, // placeholder - replace with real auth later
        latitude: coords ? coords.lat : null,
        longitude: coords ? coords.lng : null,
      }

      await postJob(body)
      setStatus('Job posted successfully! Providers will see it on the dashboard.')

      // reset
      setForm({ title: '', description: '', service_type: 'Lawn Care', urgency: 'Today', address: '' })
      setCoords(null)
      if (markerRef.current && mapInstance.current) {
        mapInstance.current.removeLayer(markerRef.current)
        markerRef.current = null
      }
    } catch (err) {
      setStatus('Failed to post job. Is the backend running on port 8000?')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div id="wrapper">
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Job title</label>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Mow the front yard and edge sidewalks"
              required
            />
          </div>

          <div className="field">
            <label>What needs to be done?</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Describe the work so providers know exactly what to expect."
              required
            />
          </div>

          <div className="row">
            <div className="field">
              <label>Service type</label>
              <select name="service_type" value={form.service_type} onChange={handleChange}>
                <option>Lawn Care</option>
                <option>Landscaping</option>
                <option>Tree Care</option>
                <option>Seasonal Clean-up</option>
              </select>
            </div>
            <div className="field">
              <label>When do you need it?</label>
              <select name="urgency" value={form.urgency} onChange={handleChange}>
                <option>Today</option>
                <option>This week</option>
                <option>Next week</option>
              </select>
            </div>
          </div>

          <div className="field">
            <label>Address</label>
            <input
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="123 Maple St, Brooklyn, NY"
              required
            />
          </div>

          <div className="field">
            <label>Selected location</label>
            <div className="note">
              {coords
                ? `Selected: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
                : 'Click on the map to select the service location.'}
            </div>
          </div>

          <button type="submit" className="primary" disabled={submitting}>
            {submitting ? 'Posting...' : 'Post job'}
          </button>

          {status && <p className="note" style={{ marginTop: 16, color: status.includes('success') ? '#2e6d34' : '#b33' }}>{status}</p>}
        </form>
      </div>

      <div className="map-card card">
        <h2>Pick the location</h2>
        <div id="map" ref={mapRef} style={{ minHeight: '520px', borderRadius: '24px' }}></div>
        <p className="note">
          Selecting the exact spot helps the right provider show up faster.
        </p>
      </div>
    </div>
  )
}

export default JobPostForm
