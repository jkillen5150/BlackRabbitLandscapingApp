import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function JobMap() {
  const [jobs, setJobs] = useState([]);
  const center = [47.0379, -122.9015]; // Yelm / Rainier, WA area

  useEffect(() => {
    fetch('http://localhost:8000/jobs')
      .then(r => r.json())
      .then(data => setJobs(data.jobs || data))
      .catch(err => console.error('Failed to fetch jobs:', err));
  }, []);

  return (
    <div style={{ height: '500px', width: '100%', margin: '20px 0' }}>
      <h2>📍 Available Jobs Near You</h2>
      <MapContainer center={center} zoom={10} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {jobs.map(job => (
          <Marker 
            key={job.id} 
            position={[job.lat || 47.0379, job.lon || -122.9015]}
          >
            <Popup>
              <strong>{job.title}</strong><br />
              ${job.price}<br />
              {job.description}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
