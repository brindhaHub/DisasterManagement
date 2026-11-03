import { useEffect, useMemo, useState } from 'react';
import MapView from './MapView';
import { api } from '../api';

const TYPES = ['rescue', 'food', 'water', 'medical', 'shelter', 'other'];

export default function ReliefNetwork({ user }) {
  const [shelters, setShelters] = useState([]);
  const [resources, setResources] = useState([]);
  const [mode, setMode] = useState('shelter');
  const [pos, setPos] = useState(null);
  const [msg, setMsg] = useState('');
  const [f, setF] = useState({ name: '', address: '', capacity: 50, contact: '', type: 'food', quantity: 10, unit: 'packets' });

  const canEdit = user && ['ngo', 'admin'].includes(user.role);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const load = () => {
    api('/shelters').then(setShelters).catch(() => {});
    api('/resources').then(setResources).catch(() => {});
  };
  useEffect(load, []);

  const points = useMemo(
    () => [
      ...shelters.map((s) => ({ lat: s.location.coordinates[1], lng: s.location.coordinates[0], color: '#2a9d8f', label: `🏠 ${s.name} (${s.occupied}/${s.capacity})` })),
      ...resources.map((r) => ({ lat: r.location.coordinates[1], lng: r.location.coordinates[0], color: '#1d4ed8', label: `📦 ${r.name}: ${r.quantity} ${r.unit}` })),
      ...(pos ? [{ lat: pos.lat, lng: pos.lng, color: '#d62828', label: 'New location' }] : []),
    ],
    [shelters, resources, pos]
  );

  const add = async (e) => {
    e.preventDefault();
    if (!pos) return setMsg('Tap the map to set the location');
    const body = mode === 'shelter'
      ? { name: f.name, address: f.address, capacity: +f.capacity, contact: f.contact, lat: pos.lat, lng: pos.lng }
      : { name: f.name, type: f.type, quantity: +f.quantity, unit: f.unit, contact: f.contact, lat: pos.lat, lng: pos.lng };
    try {
      await api(mode === 'shelter' ? '/shelters' : '/resources', { method: 'POST', body });
      setMsg('Added ✔');
      setPos(null);
      load();
    } catch (err) {
      setMsg(err.message);
    }
  };

  const updShelter = async (s) => {
    const v = prompt(`People currently in "${s.name}" (capacity ${s.capacity})`, s.occupied);
    if (v !== null) { await api(`/shelters/${s._id}`, { method: 'PATCH', body: { occupied: v } }).catch((e) => alert(e.message)); load(); }
  };
  const updRes = async (r) => {
    const v = prompt(`Remaining quantity of "${r.name}"`, r.quantity);
    if (v !== null) { await api(`/resources/${r._id}`, { method: 'PATCH', body: { quantity: v } }).catch((e) => alert(e.message)); load(); }
  };
  const delRes = async (r) => {
    if (confirm('Delete this resource?')) { await api(`/resources/${r._id}`, { method: 'DELETE' }).catch((e) => alert(e.message)); load(); }
  };

  return (
    <>
      <div className="card">
        <p>🟢 Shelters &nbsp; 🔵 Resources (tap a dot for details)</p>
        <MapView points={points} onPick={canEdit ? (lat, lng) => setPos({ lat, lng }) : undefined} height={320} />
      </div>

      <div className="grid2">
        <div className="card">
          <h3>🏠 Shelters</h3>
          {shelters.length === 0 && <p>No shelters listed yet.</p>}
          {shelters.map((s) => {
            const pct = Math.round((s.occupied / s.capacity) * 100);
            return (
              <div key={s._id} style={{ marginBottom: 12 }}>
                <b>{s.name}</b> <span className="pill">{s.capacity - s.occupied > 0 ? `${s.capacity - s.occupied} beds free` : 'FULL'}</span>
                <div className="bar"><div className={pct >= 100 ? 'full' : ''} style={{ width: pct + '%' }} /></div>
                <small>{s.address} · 📞 {s.contact}</small>
                {canEdit && <> <button className="chip" onClick={() => updShelter(s)}>Update count</button></>}
              </div>
            );
          })}
        </div>

        <div className="card">
          <h3>📦 Resources</h3>
          {resources.length === 0 && <p>No resources listed yet.</p>}
          {resources.map((r) => (
            <div key={r._id} style={{ marginBottom: 10 }}>
              <b>{r.name}</b> <span className="pill">{r.type}</span> <span className="pill">{r.quantity} {r.unit}</span>
              <br /><small>{r.owner?.organization || r.owner?.name || ''} {r.contact && `· 📞 ${r.contact}`}</small>
              {canEdit && <> <button className="chip" onClick={() => updRes(r)}>Update</button><button className="chip" onClick={() => delRes(r)}>Delete</button></>}
            </div>
          ))}
        </div>
      </div>

      {canEdit && (
        <form className="card" onSubmit={add}>
          <h3>➕ Add to the network (NGO / Admin)</h3>
          <div className="chips">
            <button type="button" className={`chip ${mode === 'shelter' ? 'on' : ''}`} onClick={() => setMode('shelter')}>Shelter</button>
            <button type="button" className={`chip ${mode === 'resource' ? 'on' : ''}`} onClick={() => setMode('resource')}>Resource</button>
          </div>
          <label>Name</label>
          <input required value={f.name} onChange={(e) => set('name', e.target.value)} />
          {mode === 'shelter' ? (
            <>
              <label>Address</label>
              <input value={f.address} onChange={(e) => set('address', e.target.value)} />
              <label>Capacity</label>
              <input type="number" min="1" value={f.capacity} onChange={(e) => set('capacity', e.target.value)} />
            </>
          ) : (
            <>
              <label>Type</label>
              <select value={f.type} onChange={(e) => set('type', e.target.value)}>{TYPES.map((x) => <option key={x}>{x}</option>)}</select>
              <label>Quantity</label>
              <input type="number" min="0" value={f.quantity} onChange={(e) => set('quantity', e.target.value)} />
              <label>Unit</label>
              <input value={f.unit} onChange={(e) => set('unit', e.target.value)} />
            </>
          )}
          <label>Contact phone</label>
          <input value={f.contact} onChange={(e) => set('contact', e.target.value)} />
          <p className={pos ? 'ok' : 'msg'}>{pos ? 'Location selected on map ✔' : 'Tap the map above to choose the location'} {msg}</p>
          <button className="btn">Save</button>
        </form>
      )}
    </>
  );
}