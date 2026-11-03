const mongoose = require('mongoose');
const { Schema } = mongoose;

const point = {
  type: { type: String, enum: ['Point'], default: 'Point' },
  coordinates: { type: [Number], required: true }, // [lng, lat]
};

const User = mongoose.model(
  'User',
  new Schema(
    {
      name: { type: String, required: true },
      email: { type: String, required: true, unique: true, lowercase: true },
      phone: String,
      password: { type: String, required: true },
      role: { type: String, enum: ['volunteer', 'ngo', 'admin'], default: 'volunteer' },
      organization: String,
    },
    { timestamps: true }
  )
);

const sosSchema = new Schema(
  {
    trackingId: { type: String, unique: true },
    clientId: { type: String, unique: true, sparse: true }, // prevents duplicates when offline queue retries
    name: String,
    phone: { type: String, required: true },
    category: { type: String, enum: ['rescue', 'food', 'water', 'medical', 'shelter'], required: true },
    urgency: { type: String, enum: ['critical', 'high', 'medium', 'low'], default: 'high' },
    people: { type: Number, default: 1, min: 1 },
    vulnerable: [String],
    description: String,
    address: String,
    location: point,
    priority: { type: Number, default: 0 },
    reports: { type: Number, default: 1 },
    status: { type: String, enum: ['pending', 'assigned', 'in_progress', 'resolved'], default: 'pending' },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    timeline: [{ status: String, note: String, at: { type: Date, default: Date.now } }],
  },
  { timestamps: true }
);
sosSchema.index({ location: '2dsphere' });
const Sos = mongoose.model('Sos', sosSchema);

const resSchema = new Schema(
  {
    name: { type: String, required: true },
    type: { type: String, enum: ['rescue', 'food', 'water', 'medical', 'shelter', 'other'], required: true },
    quantity: { type: Number, default: 0, min: 0 },
    unit: { type: String, default: 'units' },
    contact: String,
    location: point,
    owner: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
resSchema.index({ location: '2dsphere' });
const Resource = mongoose.model('Resource', resSchema);

const shelterSchema = new Schema(
  {
    name: { type: String, required: true },
    address: String,
    capacity: { type: Number, default: 50 },
    occupied: { type: Number, default: 0 },
    contact: String,
    location: point,
  },
  { timestamps: true }
);
shelterSchema.index({ location: '2dsphere' });
const Shelter = mongoose.model('Shelter', shelterSchema);

const Alert = mongoose.model(
  'Alert',
  new Schema(
    {
      title: { type: String, required: true },
      message: String,
      severity: { type: String, enum: ['info', 'warning', 'danger'], default: 'warning' },
    },
    { timestamps: true }
  )
);

module.exports = { User, Sos, Resource, Shelter, Alert };