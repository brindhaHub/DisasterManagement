import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// points: [{lat, lng, color, label, radius}]   onPick(lat,lng): tap-on-map handler
export default function MapView({ points = [], onPick, center, height = 340 }) {
  const el = useRef(null);
  const map = useRef(null);
  const layer = useRef(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;

  useEffect(() => {
    // default centre: Chennai. Change to your region
    map.current = L.map(el.current).setView([13.0827, 80.2707], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    map.current.on('click', (e) => pickRef.current && pickRef.current(e.latlng.lat, e.latlng.lng));
    return () => map.current.remove();
  }, []);

  useEffect(() => {
    layer.current.clearLayers();
    points.forEach((p) => {
      const d = document.createElement('div');
      d.textContent = p.label || '';
      L.circleMarker([p.lat, p.lng], { radius: p.radius || 9, color: p.color, fillColor: p.color, fillOpacity: 0.7 })
        .bindPopup(d)
        .addTo(layer.current);
    });
  }, [points]);

  const lat = center?.[0];
  const lng = center?.[1];
  useEffect(() => {
    if (lat != null && lng != null) map.current.setView([lat, lng], 15);
  }, [lat, lng]);

  return <div ref={el} style={{ height, borderRadius: 12, zIndex: 0 }} />;
}