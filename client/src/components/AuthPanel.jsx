import { useState } from 'react';
import { api } from '../api';

export default function AuthPanel({ onAuth }) {
  const [reg, setReg] = useState(false);
  const [f, setF] = useState({ name: '', email: '', password: '', phone: '', organization: '', role: 'volunteer', adminKey: '' });
  const [err, setErr] = useState('');
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      const r = await api(reg ? '/auth/register' : '/auth/login', { method: 'POST', body: f });
      localStorage.setItem('rl_token', r.token);
      onAuth(r.user);
    } catch (e2) {
      setErr(e2.message);
    }
  };

  return (
    <form className="card" style={{ maxWidth: 460, margin: '0 auto' }} onSubmit={submit}>
      <h2>{reg ? 'Register as responder' : 'Responder login'}</h2>
      <p>For volunteers, NGOs and the control room. Citizens do not need an account.</p>
      {reg && (
        <>
          <label>Full name</label>
          <input required value={f.name} onChange={(e) => set('name', e.target.value)} />
          <label>Phone</label>
          <input value={f.phone} onChange={(e) => set('phone', e.target.value)} />
          <label>Organization / NGO (optional)</label>
          <input value={f.organization} onChange={(e) => set('organization', e.target.value)} />
          <label>I am a</label>
          <select value={f.role} onChange={(e) => set('role', e.target.value)}>
            <option value="volunteer">Volunteer</option>
            <option value="ngo">NGO / Relief organization</option>
            <option value="admin">Admin (needs key)</option>
          </select>
          {f.role === 'admin' && (
            <>
              <label>Admin key</label>
              <input value={f.adminKey} onChange={(e) => set('adminKey', e.target.value)} />
            </>
          )}
        </>
      )}
      <label>Email</label>
      <input type="email" required value={f.email} onChange={(e) => set('email', e.target.value)} />
      <label>Password</label>
      <input type="password" required minLength={6} value={f.password} onChange={(e) => set('password', e.target.value)} />
      {err && <p className="msg">{err}</p>}
      <button className="btn" style={{ width: '100%' }}>{reg ? 'Register' : 'Login'}</button>
      <p style={{ textAlign: 'center' }}>
        <a href="#" onClick={(e) => { e.preventDefault(); setReg(!reg); setErr(''); }}>
          {reg ? 'Already registered? Login' : 'New responder? Register'}
        </a>
      </p>
    </form>
  );
}