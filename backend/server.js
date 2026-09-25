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
const NGO = require('./models/ngo');

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

// ---------- SOS ----------

// List SOS requests
//   /api/sos                    -> all requests
//   /api/sos?status=active      -> Pending + In Progress
//   /api/sos?status=Pending     -> only one status
app.get('/api/sos', async (req, res) => {
  try {
    const filter = {};
    const { status } = req.query;
    if (status === 'active') {
      filter.status = { $in: ['Pending', 'In Progress'] };
    } else if (status) {
      filter.status = status;
    }

    const requests = await SOS.find(filter)
      .sort({ timestamp: -1 })
      .populate('assignedTo', 'name phone district');
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// One SOS request by id
app.get('/api/sos/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid SOS id' });
  }
  try {
    const sos = await SOS.findById(req.params.id)
      .populate('assignedTo', 'name phone district');
    if (!sos) {
      return res.status(404).json({ error: 'SOS not found' });
    }
    res.json(sos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Assign / accept an SOS for an NGO. Body: { "ngoId": "..." }
app.patch('/api/sos/:id/assign', async (req, res) => {
  const { id } = req.params;
  const { ngoId } = req.body;
  if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(ngoId)) {
    return res.status(400).json({ error: 'Invalid SOS id or NGO id' });
  }

  try {
    const ngo = await NGO.findById(ngoId);
    if (!ngo) {
      return res.status(404).json({ error: 'NGO not found' });
    }

    // Only a Pending SOS can be assigned, so two NGOs can't accept the same one
    const sos = await SOS.findOneAndUpdate(
      { _id: id, status: 'Pending' },
      { assignedTo: ngoId, assignedAt: new Date(), status: 'In Progress' },
      { new: true }
    ).populate('assignedTo', 'name phone district');

    if (!sos) {
      const exists = await SOS.exists({ _id: id });
      if (!exists) {
        return res.status(404).json({ error: 'SOS not found' });
      }
      return res.status(409).json({ error: 'This SOS is already assigned or resolved' });
    }

    res.json(sos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update status. Body: { "status": "Pending" | "In Progress" | "Resolved" }
const SOS_STATUSES = ['Pending', 'In Progress', 'Resolved'];

app.patch('/api/sos/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid SOS id' });
  }
  if (!SOS_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${SOS_STATUSES.join(', ')}` });
  }

  try {
    const update = { status };
    if (status === 'Resolved') {
      update.resolvedAt = new Date();
    } else {
      update.resolvedAt = null;
    }
    if (status === 'Pending') {
      // Back to Pending means un-assigned, so another NGO can accept it
      update.assignedTo = null;
      update.assignedAt = null;
    }

    const sos = await SOS.findByIdAndUpdate(id, update, { new: true })
      .populate('assignedTo', 'name phone district');
    if (!sos) {
      return res.status(404).json({ error: 'SOS not found' });
    }
    res.json(sos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- NGOs ----------

// Add an NGO
app.post('/api/ngos', async (req, res) => {
  try {
    const ngo = new NGO(req.body);
    await ngo.save();
    res.status(201).json(ngo);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// List all NGOs
app.get('/api/ngos', async (req, res) => {
  try {
    const ngos = await NGO.find().sort({ name: 1 });
    res.json(ngos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// One NGO by id
app.get('/api/ngos/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid NGO id' });
  }
  try {
    const ngo = await NGO.findById(req.params.id);
    if (!ngo) {
      return res.status(404).json({ error: 'NGO not found' });
    }
    res.json(ngo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
    res.status(500).json({ error: err.message });
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