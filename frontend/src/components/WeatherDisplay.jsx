import { useEffect, useState } from 'react';

export default function WeatherDisplay({ lat, lon }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!lat || !lon) return;
    setLoading(true);
    fetch(`http://localhost:8000/weather?lat=${lat}&lon=${lon}`)
      .then(r => r.json())
      .then(data => {
        if (!data.error) setWeather(data);
      })
      .finally(() => setLoading(false));
  }, [lat, lon]);

  if (!lat || !lon) return null;
  if (loading) return <div style={{fontSize: '0.85rem'}}>Loading weather...</div>;
  if (!weather) return null;

  return (
    <div style={{ fontSize: '0.9rem', background: '#f0ede5', padding: '8px 12px', borderRadius: 8, marginTop: 8 }}>
      <strong>Current weather:</strong> {weather.temp}°F, {weather.description} • Humidity {weather.humidity}% • Wind {weather.wind_speed} mph
    </div>
  );
}