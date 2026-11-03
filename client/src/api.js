// Put your control-room SMS gateway number here (used for the no-internet SMS fallback)
export const HELPLINE = '+910000000000';

export const STATUS_LABEL = {
  pending: 'Waiting for a responder',
  assigned: 'Responder assigned',
  in_progress: 'Help is on the way',
  resolved: 'Resolved',
  merged: 'Merged with nearby report',
};

export const getToken = () => localStorage.getItem('rl_token');

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch('/api' + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Request failed'), { status: res.status });
  return data;
}

/* ---- offline SOS queue ---- */
const QK = 'rl_queue';
export const getQueue = () => JSON.parse(localStorage.getItem(QK) || '[]');

export async function submitSos(payload) {
  payload.clientId = payload.clientId || Date.now() + '-' + Math.random().toString(36).slice(2);
  try {
    return await api('/requests', { method: 'POST', body: payload });
  } catch (e) {
    if (e.status) throw e; // server answered with an error
    localStorage.setItem(QK, JSON.stringify([...getQueue(), payload])); // network down
    return { queued: true };
  }
}

export async function syncQueue() {
  const left = [];
  const done = [];
  for (const p of getQueue()) {
    try {
      const r = await api('/requests', { method: 'POST', body: p });
      done.push(r);
      const old = JSON.parse(localStorage.getItem('rl_tracks') || '[]');
      localStorage.setItem('rl_tracks', JSON.stringify([r.trackingId, ...old].slice(0, 10)));
    } catch (e) {
      if (!e.status) left.push(p);
    }
  }
  localStorage.setItem(QK, JSON.stringify(left));
  return done;
}