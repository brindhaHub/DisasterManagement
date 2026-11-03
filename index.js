const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_DB_URI)
  .then(() => console.log('Database connected successfully'))
  .catch((err) => console.log(err));

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use('/api', require('./routes/api'));

// Serve the built React app in production (after `npm run build` in /client)
const dist = path.join(__dirname, 'client', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.use((req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});