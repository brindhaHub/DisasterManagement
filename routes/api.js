const router = require('express').Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { User, Sos, Resource, Shelter, Alert } = require('../models');

const SECRET = process.env.JWT_SECRET || 'change-this-secret';
const RESPONDERS = ['volunteer', 'ngo', 'admin'];
const NGO_ADMIN = ['ngo', 'admin'];

/* ---------- helpers ---------- */
const wrap = (fn) => (req, res) =>
  fn(req, res).catch((e) => {
    console.error(e);
    res.status(e.name === 'ValidationError' ? 400 : 500).json({ error: e.message });
  });

const auth = (roles = []) => async (req, res, next) => {
  let user;
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    user = await User.findById(jwt.verify(token, SECRET).id).select('-password');
  } catch (e) {}
  if (!user) return res.status(401).json({ error: 'Please login first' });
  if (roles.length && !roles.includes(user.role)) return res.status(403).json({ error: 'Not allowed for your role' });
  req.user = user;
  next();
};

const pub = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role, organization: u.organization });
const sign = (u) => ({ token: jwt.sign({ id: u._id }, SECRET, { expiresIn: '7d' }), user: pub(u) });

// distance in km between two [lng, lat] points
const km = ([lng1, lat1], [lng2, lat2]) => {
  const r = Math.PI / 180;
  const a =
    Math.sin(((lat2 - lat1) * r) / 2) ** 2 +
    Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lng2 - lng1) * r) / 2) ** 2;
  return Math.round(12742 * Math.asin(Math.sqrt(a)) * 10) / 10;
};

/* ---------- triage scoring ---------- */
const URG = { critical: 50, high: 35, medium: 20, low: 10 };
const CAT = { rescue: 15, medical: 12, water: 6, food: 4, shelter: 3 };
const score = (r) =>
  Math.round(
    URG[r.urgency] +
      Math.min(r.people, 20) * 1.5 +
      (r.vulnerable || []).length * 8 +
      CAT[r.category] +
      Math.min((r.reports - 1) * 3, 15)
  );
// waiting time raises priority so nobody is forgotten (max +30)
const withWait = (doc) => {
  const o = doc.toObject();
  const hrs = (Date.now() - new Date(o.createdAt)) / 36e5;
  o.waitingHours = Math.round(hrs * 10) / 10;
  o.effectivePriority = Math.round(o.priority + Math.min(hrs * 2, 30));
  return o;
};

/* ---------- auth ---------- */
router.post('/auth/register', wrap(async (req, res) => {
  const { name, email, password, phone, organization, role, adminKey } = req.body;
  if (!name || !email || !password || password.length < 6)
    return res.status(400).json({ error: 'Name, email and a password of 6+ characters are required' });
  if (await User.findOne({ email: email.toLowerCase() }))
    return res.status(409).json({ error: 'Email already registered' });
  let r = role === 'ngo' ? 'ngo' : 'volunteer';
  if (role === 'admin') {
    if (!process.env.ADMIN_KEY || adminKey !== process.env.ADMIN_KEY)
      return res.status(403).json({ error: 'Invalid admin key' });
    r = 'admin';
  }
  const u = await User.create({ name, email, phone, organization, role: r, password: await bcrypt.hash(password, 10) });
  res.status(201).json(sign(u));
}));

router.post('/auth/login', wrap(async (req, res) => {
  const u = await User.findOne({ email: (req.body.email || '').toLowerCase() });
  if (!u || !(await bcrypt.compare(req.body.password || '', u.password)))
    return res.status(401).json({ error: 'Wrong email or password' });
  res.json(sign(u));
}));

router.get('/auth/me', auth(), (req, res) => res.json(pub(req.user)));

/* ---------- SOS requests ---------- */
// PUBLIC: citizens need no login
router.post('/requests', wrap(async (req, res) => {
  const { name, phone, category, urgency = 'high', people = 1, vulnerable = [], description, address, lat, lng, clientId } = req.body;
  if (!phone || !category || lat == null || lng == null)
    return res.status(400).json({ error: 'Phone, category and location are required' });

  if (clientId) {
    const existing = await Sos.findOne({ clientId });
    if (existing) return res.json({ trackingId: existing.trackingId, merged: false });
  }

  const geo = { type: 'Point', coordinates: [Number(lng), Number(lat)] };

  // duplicate detection: same need, within 150 m, last 12 h, not resolved
  const near = await Sos.findOne({
    category,
    status: { $ne: 'resolved' },
    createdAt: { $gt: new Date(Date.now() - 12 * 36e5) },
    location: { $near: { $geometry: geo, $maxDistance: 150 } },
  });
  if (near) {
    near.reports += 1;
    near.priority = score(near);
    near.timeline.push({ status: 'merged', note: 'Another report from the same area was merged' });
    await near.save();
    return res.json({ trackingId: near.trackingId, merged: true });
  }

  const doc = new Sos({
    trackingId: 'RL-' + crypto.randomBytes(3).toString('hex').toUpperCase(),
    clientId, name, phone, category, urgency,
    people: Math.max(1, Number(people) || 1),
    vulnerable, description, address, location: geo,
  });
  doc.priority = score(doc);
  doc.timeline.push({ status: 'pending', note: 'Request received. Waiting for a responder' });
  await doc.save();
  res.status(201).json({ trackingId: doc.trackingId, merged: false });
}));

// PUBLIC: status by tracking ID (no phone/location leaked)
router.get('/track/:tid', wrap(async (req, res) => {
  const r = await Sos.findOne({ trackingId: req.params.tid }).populate('assignedTo', 'name organization');
  if (!r) return res.status(404).json({ error: 'No request found with this tracking ID' });
  res.json({
    trackingId: r.trackingId, category: r.category, urgency: r.urgency, status: r.status,
    reports: r.reports, createdAt: r.createdAt,
    responder: r.assignedTo ? r.assignedTo.organization || r.assignedTo.name : null,
    timeline: r.timeline.map((x) => ({ status: x.status, note: x.note, at: x.at })),
  });
}));

// RESPONDERS: full board sorted by priority
router.get('/requests', auth(RESPONDERS), wrap(async (req, res) => {
  const list = await Sos.find().populate('assignedTo', 'name organization phone').limit(500);
  res.json(list.map(withWait).sort((a, b) => b.effectivePriority - a.effectivePriority));
}));

// first responder to claim wins (atomic): prevents duplicate relief
router.post('/requests/:id/claim', auth(RESPONDERS), wrap(async (req, res) => {
  const r = await Sos.findOneAndUpdate(
    { _id: req.params.id, status: 'pending' },
    {
      status: 'assigned',
      assignedTo: req.user._id,
      $push: { timeline: { status: 'assigned', note: `Taken by ${req.user.organization || req.user.name}` } },
    },
    { new: true }
  );
  if (!r) return res.status(409).json({ error: 'Already taken by another responder' });
  res.json(r);
}));

// status: pending (release) | in_progress | resolved
router.patch('/requests/:id/status', auth(RESPONDERS), wrap(async (req, res) => {
  const { status, note } = req.body;
  if (!['pending', 'in_progress', 'resolved'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const r = await Sos.findById(req.params.id);
  if (!r) return res.status(404).json({ error: 'Not found' });
  const mine = r.assignedTo && r.assignedTo.equals(req.user._id);
  if (!mine && req.user.role !== 'admin') return res.status(403).json({ error: 'Only the assigned responder can update this' });
  const defaults = { pending: 'Responder released the case. Waiting for another', in_progress: 'Help is on the way', resolved: 'Help delivered. Case closed' };
  if (status === 'pending') r.assignedTo = null;
  r.status = status;
  r.timeline.push({ status, note: note || defaults[status] });
  await r.save();
  res.json(r);
}));

// nearest matching resources/shelters for a request
router.get('/requests/:id/matches', auth(RESPONDERS), wrap(async (req, res) => {
  const r = await Sos.findById(req.params.id);
  if (!r) return res.status(404).json({ error: 'Not found' });
  const from = r.location.coordinates;
  const near = { $near: { $geometry: { type: 'Point', coordinates: from }, $maxDistance: 50000 } };
  const [resources, shelters] = await Promise.all([
    Resource.find({ type: r.category, quantity: { $gt: 0 }, location: near }).limit(5),
    r.category === 'shelter' ? Shelter.find({ location: near }).limit(10) : [],
  ]);
  res.json({
    resources: resources.map((x) => ({ ...x.toObject(), distanceKm: km(from, x.location.coordinates) })),
    shelters: shelters
      .filter((s) => s.occupied < s.capacity)
      .map((x) => ({ ...x.toObject(), distanceKm: km(from, x.location.coordinates) })),
  });
}));

/* ---------- resources ---------- */
router.get('/resources', wrap(async (req, res) => {
  res.json(await Resource.find().populate('owner', 'name organization').sort({ updatedAt: -1 }).limit(300));
}));

router.post('/resources', auth(NGO_ADMIN), wrap(async (req, res) => {
  const { name, type, quantity, unit, contact, lat, lng } = req.body;
  if (lat == null || lng == null) return res.status(400).json({ error: 'Location required' });
  res.status(201).json(
    await Resource.create({ name, type, quantity, unit, contact, owner: req.user._id, location: { type: 'Point', coordinates: [+lng, +lat] } })
  );
}));

router.patch('/resources/:id', auth(NGO_ADMIN), wrap(async (req, res) => {
  const r = await Resource.findById(req.params.id);
  if (!r) return res.status(404).json({ error: 'Not found' });
  if (String(r.owner) !== String(req.user._id) && req.user.role !== 'admin') return res.status(403).json({ error: 'Not your resource' });
  r.quantity = Math.max(0, Number(req.body.quantity));
  await r.save();
  res.json(r);
}));

router.delete('/resources/:id', auth(NGO_ADMIN), wrap(async (req, res) => {
  const r = await Resource.findById(req.params.id);
  if (!r) return res.status(404).json({ error: 'Not found' });
  if (String(r.owner) !== String(req.user._id) && req.user.role !== 'admin') return res.status(403).json({ error: 'Not your resource' });
  await r.deleteOne();
  res.json({ ok: true });
}));

/* ---------- shelters ---------- */
router.get('/shelters', wrap(async (req, res) => res.json(await Shelter.find().sort({ createdAt: -1 }).limit(300))));

router.post('/shelters', auth(NGO_ADMIN), wrap(async (req, res) => {
  const { name, address, capacity, contact, lat, lng } = req.body;
  if (lat == null || lng == null) return res.status(400).json({ error: 'Location required' });
  res.status(201).json(await Shelter.create({ name, address, capacity, contact, location: { type: 'Point', coordinates: [+lng, +lat] } }));
}));

router.patch('/shelters/:id', auth(NGO_ADMIN), wrap(async (req, res) => {
  const s = await Shelter.findById(req.params.id);
  if (!s) return res.status(404).json({ error: 'Not found' });
  s.occupied = Math.min(s.capacity, Math.max(0, Number(req.body.occupied)));
  await s.save();
  res.json(s);
}));

/* ---------- alerts & stats ---------- */
router.get('/alerts', wrap(async (req, res) => res.json(await Alert.find().sort({ createdAt: -1 }).limit(5))));

router.post('/alerts', auth(['admin']), wrap(async (req, res) => {
  res.status(201).json(await Alert.create({ title: req.body.title, message: req.body.message, severity: req.body.severity }));
}));

router.get('/stats', wrap(async (req, res) => {
  const rows = await Sos.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, people: { $sum: '$people' } } }]);
  const s = { pending: 0, assigned: 0, in_progress: 0, resolved: 0, peopleHelped: 0, peopleWaiting: 0 };
  rows.forEach((r) => {
    s[r._id] = r.count;
    if (r._id === 'resolved') s.peopleHelped = r.people;
    else s.peopleWaiting += r.people;
  });
  s.responders = await User.countDocuments();
  s.shelters = await Shelter.countDocuments();
  res.json(s);
}));

module.exports = router;