import { useMemo, useState } from 'react';
import MapView from './MapView';
import { submitSos, HELPLINE } from '../api';
import { t } from '../i18n';

const CATS = ['rescue', 'food', 'water', 'medical', 'shelter'];
const URG = ['critical', 'high', 'medium', 'low'];
const VULN = ['elderly', 'children', 'patient', 'pregnant', 'disabled'];

export default function SosForm({ lang }) {
  const [f, setF] = useState({ name: '', phone: '', category: 'rescue', urgency: 'high', people: 1, vulnerable: [], description: '', address: '' });
  const [pos, setPos] = useState(null);
  const [msg, setMsg] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const toggleV = (v) => set('vulnerable', f.vulnerable.includes(v) ? f.vulnerable.filter((x) => x !== v) : [...f.vulnerable, v]);

  const gps = () => {
    if (!navigator.geolocation) return setMsg('GPS not supported. Tap your location on the map.');
    setMsg('Finding your location…');
    navigator.geolocation.getCurrentPosition(
      (p) => { setPos({ lat: p.coords.latitude, lng: p.coords.longitude }); setMsg(`Location locked (±${Math.round(p.coords.accuracy)} m)`); },
      () => setMsg('Could not get GPS. Tap your location on the map.'),
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  const points = useMemo(() => (pos ? [{ lat: pos.lat, lng: pos.lng, color: '#d62828', label: 'Your location' }] : []), [pos]);
  const center = pos ? [pos.lat, pos.lng] : undefined;

  const submit = async (e) => {
    e.preventDefault();
    if (!pos) return setMsg('Please set your location (GPS button or tap on the map)');
    if (!/^[+\d][\d\s-]{6,14}$/.test(f.phone)) return setMsg('Enter a valid phone number');
    setBusy(true);
    setMsg('');
    try {
      const r = await submitSos({ ...f, people: Number(f.people) || 1, lat: pos.lat, lng: pos.lng });
      if (r.trackingId) {
        const old = JSON.parse(localStorage.getItem('rl_tracks') || '[]');
        localStorage.setItem('rl_tracks', JSON.stringify([r.trackingId, ...old.filter((x) => x !== r.trackingId)].slice(0, 10)));
      }
      setResult(r);
    } catch (err) {
      setMsg(err.message);
    }
    setBusy(false);
  };

  const smsBody = `SOS ${f.category} ${f.urgency} people:${f.people} ph:${f.phone} loc:https://maps.google.com/?q=${pos?.lat},${pos?.lng}`;
  const smsHref = `sms:${HELPLINE}?body=${encodeURIComponent(smsBody)}`;

  if (result)
    return (
      <div className="card center">
        {result.queued ? (
          <>
            <h2>📴 No internet. SOS saved on your phone</h2>
            <p>It will be sent automatically when you are back online (reopen this site). If you can send SMS, use the button below.</p>
            <a className="btn" href={smsHref}>Send via SMS instead</a>
          </>
        ) : (
          <>
            <h2>✅ Help request registered</h2>
            <p>Your tracking ID (save or screenshot it):</p>
            <div className="tid">{result.trackingId}</div>
            {result.merged && <p>A similar request from your area already existed. Yours was merged and raised its priority, so responders won't duplicate effort.</p>}
            <p>Open the <b>Track</b> tab to see progress.</p>
          </>
        )}
        <br />
        <button className="btn alt" onClick={() => { setResult(null); setMsg(''); }}>New request</button>
      </div>
    );

  return (
    <form className="grid2" onSubmit={submit}>
      <div className="card">
        <h2>🆘 {t(lang, 'emergency')}</h2>

        <label>{t(lang, 'category')}</label>
        <div className="chips">
          {CATS.map((c) => (
            <button type="button" key={c} className={`chip ${f.category === c ? 'on' : ''}`} onClick={() => set('category', c)}>{t(lang, c)}</button>
          ))}
        </div>

        <label>{t(lang, 'urgency')}</label>
        <div className="chips">
          {URG.map((c) => (
            <button type="button" key={c} className={`chip red ${f.urgency === c ? 'on' : ''}`} onClick={() => set('urgency', c)}>{t(lang, c)}</button>
          ))}
        </div>

        <label>{t(lang, 'people')}</label>
        <input type="number" min="1" max="500" value={f.people} onChange={(e) => set('people', e.target.value)} />

        <label>{t(lang, 'vulnerable')}</label>
        <div className="chips">
          {VULN.map((c) => (
            <button type="button" key={c} className={`chip ${f.vulnerable.includes(c) ? 'on' : ''}`} onClick={() => toggleV(c)}>{t(lang, c)}</button>
          ))}
        </div>

        <label>{t(lang, 'phone')} *</label>
        <input required value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="9876543210" inputMode="tel" />

        <label>{t(lang, 'yourName')}</label>
        <input value={f.name} onChange={(e) => set('name', e.target.value)} />

        <label>{t(lang, 'details')}</label>
        <textarea rows="2" value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="Water up to first floor, near temple..." />
      </div>

      <div className="card">
        <label style={{ marginTop: 0 }}>{t(lang, 'location')} *</label>
        <button type="button" className="btn green small" onClick={gps}>📍 {t(lang, 'getGps')}</button>
        <p className={pos ? 'ok' : 'msg'}>{msg}</p>
        <MapView points={points} center={center} onPick={(lat, lng) => { setPos({ lat, lng }); setMsg('Location set from map'); }} />
        <button className="btn" style={{ width: '100%' }} disabled={busy}>{busy ? '…' : '🚨 ' + t(lang, 'send')}</button>
      </div>
    </form>
  );
}