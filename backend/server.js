require('dotenv').config();
const { getRainfall } = require('./services/weather');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Server is running');
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

const RiskZone = require('./models/riskZone');
const Shelter = require('./models/shelter');
const SOS = require('./models/sos');

app.get('/api/risk-zones', async (req, res) => {
  const zones = await RiskZone.find();
  res.json(zones);
});

app.get('/api/shelters', async (req, res) => {
  const shelters = await Shelter.find();
  res.json(shelters);
});

app.post('/api/sos', async (req, res) => {
  try {
    const sos = new SOS(req.body);
    await sos.save();
    res.status(201).json(sos);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/sos', async (req, res) => {
  const requests = await SOS.find().sort({ timestamp: -1 });
  res.json(requests);
});

app.post('/api/alerts/trigger', async (req, res) => {
  const { village, riskLevel } = req.body;
  res.json({ message: `Alert triggered for ${village}`, riskLevel });
});

app.get('/api/live-rainfall/:lat/:lng', async (req, res) => {
  const { lat, lng } = req.params;
  try {
    const rainfall = await getRainfall(lat, lng);
    res.json({ lat, lng, rainfall });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});