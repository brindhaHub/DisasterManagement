require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User, Shelter, Resource, Alert } = require('./models');

const P = (lat, lng) => ({ type: 'Point', coordinates: [lng, lat] });

(async () => {
  await mongoose.connect(process.env.MONGO_DB_URI);

  if (!(await User.findOne({ email: 'admin@relieflink.org' })))
    await User.create({
      name: 'Control Room Admin', email: 'admin@relieflink.org', role: 'admin',
      organization: 'District Control Room', password: await bcrypt.hash('admin123', 10),
    });

  if (!(await Shelter.countDocuments()))
    await Shelter.insertMany([
      { name: 'Govt School Relief Camp (sample)', address: 'Velachery', capacity: 200, occupied: 120, contact: '9000000001', location: P(12.9815, 80.218) },
      { name: 'Community Hall (sample)', address: 'T. Nagar', capacity: 100, occupied: 40, contact: '9000000002', location: P(13.0418, 80.2341) },
      { name: 'Marriage Hall Camp (sample)', address: 'Tambaram', capacity: 150, occupied: 150, contact: '9000000003', location: P(12.9249, 80.1) },
    ]);

  if (!(await Resource.countDocuments()))
    await Resource.insertMany([
      { name: 'Rescue Boats', type: 'rescue', quantity: 6, unit: 'boats', contact: '9000000004', location: P(13.0012, 80.2565) },
      { name: 'Food Packets', type: 'food', quantity: 500, unit: 'packets', contact: '9000000005', location: P(13.085, 80.2101) },
      { name: 'Drinking Water', type: 'water', quantity: 300, unit: 'cans (20L)', contact: '9000000006', location: P(13.0418, 80.2341) },
      { name: 'Medical Kits', type: 'medical', quantity: 80, unit: 'kits', contact: '9000000007', location: P(12.9815, 80.218) },
    ]);

  if (!(await Alert.countDocuments()))
    await Alert.create({ title: 'Heavy rainfall warning', message: 'Avoid low-lying areas. Move to the nearest shelter if water is rising.', severity: 'warning' });

  console.log('Seed done. Admin login: admin@relieflink.org / admin123 (change it!)');
  process.exit();
})();