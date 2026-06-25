import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function JobMap() {
  const [jobs, setJobs] = useState([]);
  const center = [47.0379, -122.9015]; // Yelm / Rainier area

  useEffect(() => {
    fetch('http://localhost:8000/jobs')
      .then(r => r.json())
      .then(setJobs);
  }, []);

  return (
    <div style={{ height: '500px', width: '100%', margin: '2rem 0' }}>
      <h2>📍 Available Jobs Near You</h2>
      <MapContainer center={center} zoom={10} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {jobs.map(job => (
          <Marker key={job.id} position={[job.lat, job.lon]}>
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
