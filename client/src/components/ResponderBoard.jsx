import { useEffect, useMemo, useState } from 'react';
import MapView from './MapView';
import { api, STATUS_LABEL } from '../api';

const COLOR = { critical: '#b00020', high: '#e76f00', medium: '#d4a017', low: '#2a9d8f' };
const CATS = ['', 'rescue', 'food', 'water', 'medical', 'shelter'];

export default function ResponderBoard({ user }) {
  const [list, setList] = useState([]);
  const [status, setStatus] = useState('open');
  const [cat, setCat] = useState('');
  const [matches, setMatches] = useState({});
  const [err, setErr] = useState('');
  const [alertF, setAlertF] = useState({ title: '', message: '', severity: 'warning' });
  const [alertMsg, setAlertMsg] = useState('');

  const load = () => api('/requests').then(setList).catch((e) => setErr(e.message));
  useEffect(() => {
    load();
    const i = setInterval(load, 15000); // live refresh
    return () => clearInterval(i);
  }, []);

  const act = async (id, path, body) => {
    setErr('');
    try {
      await api(`/requests/${id}/${path}`, { method: path === 'claim' ? 'POST' : 'PATCH', body });
    } catch (e) {
      setErr(e.message);
    }
    load();
  };

  const find = async (id) => {
    const d = await api(`/requests/${id}/matches`).catch((e) => { setErr(e.message); return null; });
    if (d) setMatches((m) => ({ ...m, [id]: d }));
  };

  const shown = list.filter(
    (r) => (status === 'open' ? r.status !== 'resolved' : r.status === status) && (!cat || r.category === cat)
  );

  const points = useMemo(
    () => shown.map((r) => ({
      lat: r.location.coordinates[1], lng: r.location.coordinates[0], color: COLOR[r.urgency],
      radius: 6 + Math.min(r.effectivePriority / 12, 10),
      label: `${r.trackingId} · ${r.category} · priority ${r.effectivePriority}`,
    })),
    [shown.length, list]
  );

  const broadcast = async (e) => {
    e.preventDefault();
    try {
      await api('/alerts', { method: 'POST', body: alertF });
      setAlertMsg('Alert broadcast ✔');
      setAlertF({ title: '', message: '', severity: 'warning' });
    } catch (e2) {
      setAlertMsg(e2.message);
    }
  };

  return (
    <>
      <div className="card">
        <div className="row">
          <b>Filter:</b>
          <select style={{ width: 'auto' }} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="open">All open</option>
            {Object.keys(STATUS_LABEL).filter((k) => k !== 'merged').map((k) => <option key={k} value={k}>{STATUS_LABEL[k]}</option>)}
          </select>
          <select style={{ width: 'auto' }} value={cat} onChange={(e) => setCat(e.target.value)}>
            {CATS.map((c) => <option key={c} value={c}>{c || 'All categories'}</option>)}
          </select>
          <span className="pill">{shown.length} cases · sorted by priority · auto-refresh 15 s</span>
        </div>
        {err && <p className="msg">{err}</p>}
        <br />
        <MapView points={points} height={300} />
      </div>

      {user.role === 'admin' && (
        <form className="card" onSubmit={broadcast}>
          <h3>📢 Broadcast alert to everyone</h3>
          <input required placeholder="Title" value={alertF.title} onChange={(e) => setAlertF({ ...alertF, title: e.target.value })} />
          <textarea rows="2" placeholder="Message" value={alertF.message} onChange={(e) => setAlertF({ ...alertF, message: e.target.value })} />
          <select value={alertF.severity} onChange={(e) => setAlertF({ ...alertF, severity: e.target.value })}>
            <option value="info">Info</option><option value="warning">Warning</option><option value="danger">Danger</option>
          </select>
          <button className="btn small">Broadcast</button> <span className="ok">{alertMsg}</span>
        </form>
      )}

      {shown.length === 0 && <div className="card">No cases match this filter.</div>}

      {shown.map((r) => {
        const mine = r.assignedTo?._id === user.id;
        const canAct = mine || user.role === 'admin';
        const [lng, lat] = r.location.coordinates;
        const m = matches[r._id];
        return (
          <div className="card req" key={r._id} style={{ borderLeft: `6px solid ${COLOR[r.urgency]}` }}>
            <div className="row">
              <b>{r.trackingId}</b>
              <span className="pill">{r.category}</span>
              <span className="pill">{STATUS_LABEL[r.status]}</span>
              <span className="score">Priority {r.effectivePriority}</span>
            </div>
            <p>👥 {r.people} people · ⏱ waiting {r.waitingHours} h {r.reports > 1 && <b>· 🔗 {r.reports} reports merged</b>}</p>
            {r.vulnerable?.length > 0 && <p>⚠ Vulnerable: <b>{r.vulnerable.join(', ')}</b></p>}
            {r.description && <p>📝 {r.description}</p>}
            <p>
              📞 <a href={`tel:${r.phone}`}>{r.phone}</a> {r.name && `(${r.name})`} ·{' '}
              <a target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${lat},${lng}`}>Open in Maps</a>
            </p>
            {r.assignedTo && <p>🤝 {r.assignedTo.organization || r.assignedTo.name} {r.assignedTo.phone && `(${r.assignedTo.phone})`}</p>}

            <div className="row">
              {r.status === 'pending' && <button className="btn small" onClick={() => act(r._id, 'claim')}>✋ Claim this case</button>}
              {canAct && r.status === 'assigned' && <button className="btn small alt" onClick={() => act(r._id, 'status', { status: 'in_progress' })}>🚚 On the way</button>}
              {canAct && ['assigned', 'in_progress'].includes(r.status) && <button className="btn small green" onClick={() => act(r._id, 'status', { status: 'resolved' })}>✔ Resolved</button>}
              {canAct && ['assigned', 'in_progress'].includes(r.status) && <button className="btn small alt" onClick={() => act(r._id, 'status', { status: 'pending' })}>↩ Release</button>}
              {r.status !== 'resolved' && <button className="btn small alt" onClick={() => find(r._id)}>🔎 Nearest resources</button>}
            </div>

            {m && (
              <div className="match">
                {m.resources.length === 0 && m.shelters.length === 0 && 'No matching stock within 50 km.'}
                {m.resources.map((x) => (
                  <div key={x._id}>📦 {x.name}: {x.quantity} {x.unit} · {x.distanceKm} km · 📞 {x.contact}</div>
                ))}
                {m.shelters.map((x) => (
                  <div key={x._id}>🏠 {x.name}: {x.capacity - x.occupied} beds free · {x.distanceKm} km · 📞 {x.contact}</div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}