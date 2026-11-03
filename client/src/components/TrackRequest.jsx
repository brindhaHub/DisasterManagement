import { useState } from 'react';
import { api, STATUS_LABEL } from '../api';

export default function TrackRequest() {
  const [id, setId] = useState('');
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const saved = JSON.parse(localStorage.getItem('rl_tracks') || '[]');

  const look = async (v = id) => {
    setErr('');
    setData(null);
    try {
      setData(await api(`/track/${v.trim().toUpperCase()}`));
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <div className="card">
      <h2>Track your request</h2>
      <div className="row">
        <input style={{ flex: 1 }} placeholder="RL-XXXXXX" value={id} onChange={(e) => setId(e.target.value)} />
        <button className="btn" style={{ marginTop: 0 }} onClick={() => look()}>Check</button>
      </div>

      {saved.length > 0 && (
        <p>My requests: {saved.map((s) => (
          <button key={s} className="chip" onClick={() => { setId(s); look(s); }}>{s}</button>
        ))}</p>
      )}

      {err && <p className="msg">{err}</p>}
      {data && (
        <>
          <h3>{data.trackingId}: {STATUS_LABEL[data.status]}</h3>
          <p>
            <span className="pill">{data.category}</span> <span className="pill">{data.urgency}</span>{' '}
            {data.reports > 1 && <span className="pill">{data.reports} reports merged</span>}
          </p>
          {data.responder && <p>🤝 Handled by: <b>{data.responder}</b></p>}
          <div className="timeline">
            {data.timeline.map((x, i) => (
              <div key={i}>
                <b>{STATUS_LABEL[x.status] || x.status}</b>
                <br />{x.note}
                <br /><small>{new Date(x.at).toLocaleString()}</small>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}