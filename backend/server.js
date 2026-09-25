require('dotenv').config();
const { getRainfall, getRainfall24h } = require('./services/weather');
const { calculateRisk } = require('./services/risk');
const DistrictRainfall = require('./models/districtRainfall');
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

// All districts
app.get('/api/district-rainfall', async (req, res) => {
  try {
    const data = await DistrictRainfall.find().sort({ district: 1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// One district by name, e.g. /api/district-rainfall/Udupi
app.get('/api/district-rainfall/:district', async (req, res) => {
  try {
    const data = await DistrictRainfall.findOne({ district: req.params.district })
      .collation({ locale: 'en', strength: 2 });
    if (!data) {
      return res.status(404).json({ error: 'District not found' });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });cka
  }
});

// Risk level for a district, e.g. /api/risk/Udupi?lat=13.34&lng=74.74
app.get('/api/risk/:district', async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return res.status(400).json({ error: 'Please give lat and lng, e.g. ?lat=13.34&lng=74.74' });
  }

  try {
    const district = await DistrictRainfall.findOne({ district: req.params.district })
      .collation({ locale: 'en', strength: 2 });
    if (!district) {
      return res.status(404).json({ error: 'District not found' });
    }

    let rain = await getRainfall24h(lat, lng);

    // For demos: pretend this much rain is forecast, e.g. &simulateRain=150
    if (req.query.simulateRain !== undefined) {
      const simulated = parseFloat(req.query.simulateRain);
      if (!Number.isNaN(simulated)) {
        rain = { ...rain, next24h: simulated, simulated: true };
      }
    }

    const risk = calculateRisk(rain, district);
    res.json({ district: district.district, lat, lng, rainfall: rain, risk });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});