import { useEffect, useState } from 'react';
import { api, getToken, syncQueue, getQueue, HELPLINE } from './api';
import { LANGS, t } from './i18n';
import Overview from './components/Overview';
import SosForm from './components/SosForm';
import TrackRequest from './components/TrackRequest';
import ReliefNetwork from './components/ReliefNetwork';
import ResponderBoard from './components/ResponderBoard';
import AuthPanel from './components/AuthPanel';
import './App.css';

export default function App() {
  const [tab, setTab] = useState('sos');
  const [lang, setLang] = useState(localStorage.getItem('rl_lang') || 'en');
  const [user, setUser] = useState(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (getToken()) api('/auth/me').then(setUser).catch(() => localStorage.removeItem('rl_token'));

    const sync = async () => {
      if (!getQueue().length) return;
      const done = await syncQueue();
      if (done.length) setToast(`✅ ${done.length} saved SOS request(s) were sent. Check the Track tab.`);
    };
    const on = () => { setOnline(true); sync(); };
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    sync();
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const changeLang = (l) => { setLang(l); localStorage.setItem('rl_lang', l); };
  const logout = () => { localStorage.removeItem('rl_token'); setUser(null); };

  const tabs = ['sos', 'track', 'network', 'hub'];

  return (
    <div className="app">
      <header className="top">
        <h1>🆘 ReliefLink</h1>
        <div className="row">
          {!online && <span className="pill warn">Offline mode</span>}
          <select value={lang} onChange={(e) => changeLang(e.target.value)}>
            {Object.entries(LANGS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {user && <button className="btn small alt" onClick={logout}>Logout ({user.name})</button>}
        </div>
      </header>

      <Overview />

      {toast && <div className="banner info" onClick={() => setToast('')}>{toast}</div>}

      <nav className="nav">
        {tabs.map((k) => (
          <button key={k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{t(lang, k)}</button>
        ))}
      </nav>

      {tab === 'sos' && <SosForm lang={lang} />}
      {tab === 'track' && <TrackRequest />}
      {tab === 'network' && <ReliefNetwork user={user} />}
      {tab === 'hub' && (user ? <ResponderBoard user={user} /> : <AuthPanel onAuth={setUser} />)}

      <footer>Emergency helpline / SMS: {HELPLINE} · Stay safe, move to higher ground.</footer>
    </div>
  );
}