import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Overview() {
  const [alerts, setAlerts] = useState([]);
  const [s, setS] = useState(null);

  useEffect(() => {
    const load = () => {
      api('/alerts').then(setAlerts).catch(() => {});
      api('/stats').then(setS).catch(() => {});
    };
    load();
    const i = setInterval(load, 30000);
    return () => clearInterval(i);
  }, []);

  return (
    <>
      {alerts.slice(0, 2).map((a) => (
        <div key={a._id} className={`banner ${a.severity}`}>
          <b>⚠ {a.title}</b> {a.message}
        </div>
      ))}
      {s && (
        <div className="stats">
          <div className="stat"><b>{s.peopleWaiting}</b>People waiting</div>
          <div className="stat"><b>{s.assigned + s.in_progress}</b>Being helped</div>
          <div className="stat"><b>{s.peopleHelped}</b>People helped</div>
          <div className="stat"><b>{s.shelters}</b>Shelters</div>
          <div className="stat"><b>{s.responders}</b>Responders</div>
        </div>
      )}
    </>
  );
}