const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('./models/user');
const Otp = require('./models/otp');
const { normalizePhone, createToken, optionalAuth, requireAuth, requireRole } = require('./services/auth');
const { getRainfall, getRainfall24h, getRainfall24hMany } = require('./services/weather');
const { calculateRisk } = require('./services/risk');
const DistrictRainfall = require('./models/districtRainfall');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ---------- AUTH (villager login with OTP) ----------

// What we send back about a user (never the password)
function publicUser(user) {
  return {
    _id: user._id,
    name: user.name,
    phone: user.phone,
    role: user.role,
    village: user.village,
    district: user.district,
    ngo: user.ngo
  };
}

// Step 1 of login: send a code. Body: { "phone": "9876543210" }
app.post('/api/auth/request-otp', async (req, res) => {
  const phone = normalizePhone(req.body.phone);
  if (!phone) {
    return res.status(400).json({ error: 'Please give a valid 10-digit Indian mobile number' });
  }

  try {
    const code = crypto.randomInt(100000, 1000000).toString();  // 6 digits

    await Otp.deleteMany({ phone });  // remove any older code for this phone
    await Otp.create({
      phone,
      codeHash: await bcrypt.hash(code, 10),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000)  // 5 minutes
    });

    const sms = await deliverSMS([phone], `Your Disaster Alert login code is ${code}. It expires in 5 minutes.`);
    if (sms.mode === 'live' && sms.sent === 0) {
      return res.status(502).json({ error: 'Could not send the code. Please try again.' });
    }

    const isNewUser = !(await User.exists({ phone }));
    const response = { message: 'Code sent', isNewUser, sms: sms.mode };

    // Demo mode only: SMS is off, so show the code in the response
    if (sms.mode === 'simulated') {
      response.demoOtp = code;
    }

    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Step 2 of login: check the code.
// Body: { "phone": "...", "code": "123456" }
// First time as villager, also: "name", "village", "district"
// First time as Control Centre, also: "registerAs": "control", "name", "district"
// First time as NGO, also: "registerAs": "ngo", "name" (contact person), "ngoName", "district", "services", "location"
app.post('/api/auth/verify-otp', async (req, res) => {
  const phone = normalizePhone(req.body.phone);
  const code = String(req.body.code || '').trim();
  if (!phone || !code) {
    return res.status(400).json({ error: 'Please give phone and code' });
  }

  try {
    const otp = await Otp.findOne({ phone });
    if (!otp || otp.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Code expired or not found. Please request a new one.' });
    }
    if (otp.attempts >= 5) {
      await otp.deleteOne();
      return res.status(429).json({ error: 'Too many wrong tries. Please request a new code.' });
    }

    const correct = await bcrypt.compare(code, otp.codeHash);
    if (!correct) {
      otp.attempts += 1;
      await otp.save();
      return res.status(400).json({ error: 'Wrong code' });
    }

    let user = await User.findOne({ phone });

    if (!user) {
      // First time: create the account (the code stays valid if details are missing, so the app can send them again)
      const { name, registerAs } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'New user: please give your name', needsName: true });
      }

      if (registerAs === 'control') {
        // Control Centre officer. If CONTROL_PHONES is set in .env, only those numbers may register.
        const allowed = (process.env.CONTROL_PHONES || '').split(',').map(normalizePhone).filter(Boolean);
        if (allowed.length > 0 && !allowed.includes(phone)) {
          return res.status(403).json({ error: 'This number is not allowed to register as Gram Panchayat' });
        }
        user = await User.create({ name, phone, role: 'control', district: req.body.district });
      } else if (registerAs === 'ngo') {
        if (!req.body.ngoName) {
          return res.status(400).json({ error: 'Please give the NGO name', needsNgoName: true });
        }
        const ngo = await NGO.create({
          name: req.body.ngoName,
          contactPerson: name,
          phone,
          district: req.body.district,
          location: req.body.location,
          services: Array.isArray(req.body.services) ? req.body.services : []
        });
        user = await User.create({ name, phone, role: 'ngo', ngo: ngo._id, district: req.body.district });
      } else {
        user = await User.create({
          name,
          phone,
          role: 'villager',
          village: req.body.village,
          district: req.body.district
        });
      }
    }

    await otp.deleteOne();  // a code works only once
    res.json({ token: createToken(user), user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Who am I? Needs the token in the header: Authorization: Bearer <token>
app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(publicUser(user));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
const Alert = require('./models/alert');
const EvacuationReport = require('./models/evacuationReport');
const { LEVEL_COLORS, buildAlertMessage, deliverSMS } = require('./services/alerts');

app.get('/api/risk-zones', async (req, res) => {
  const zones = await RiskZone.find();
  res.json(zones);
});

app.get('/api/shelters', async (req, res) => {
  try {
    const shelters = await Shelter.find().sort({ name: 1 });
    res.json(shelters);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Full when occupancy reaches capacity, otherwise Available
function shelterStatus(shelter) {
  return shelter.capacity > 0 && shelter.currentOccupancy >= shelter.capacity ? 'Full' : 'Available';
}

// Add a shelter (Control Centre). Body: { name, lat, lng, capacity, currentOccupancy? }
app.post('/api/shelters', requireRole('control'), async (req, res) => {
  const { name, lat, lng, capacity } = req.body;
  const currentOccupancy = Number(req.body.currentOccupancy) || 0;

  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Please give the shelter name' });
  }
  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
    return res.status(400).json({ error: 'Please give a valid latitude and longitude' });
  }
  if (!(Number(capacity) > 0)) {
    return res.status(400).json({ error: 'Capacity must be more than 0' });
  }

  try {
    const shelter = new Shelter({
      name: String(name).trim(),
      lat: Number(lat),
      lng: Number(lng),
      capacity: Number(capacity),
      currentOccupancy: Math.max(0, currentOccupancy),
    });
    shelter.status = shelterStatus(shelter);
    await shelter.save();
    res.status(201).json(shelter);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update occupancy or capacity (Control Centre). Body: { currentOccupancy?, capacity? }
app.patch('/api/shelters/:id', requireRole('control'), async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid shelter id' });
  }

  try {
    const shelter = await Shelter.findById(req.params.id);
    if (!shelter) {
      return res.status(404).json({ error: 'Shelter not found' });
    }

    if (req.body.capacity !== undefined) {
      const capacity = Number(req.body.capacity);
      if (!(capacity > 0)) {
        return res.status(400).json({ error: 'Capacity must be more than 0' });
      }
      shelter.capacity = capacity;
    }

    if (req.body.currentOccupancy !== undefined) {
      const occupancy = Number(req.body.currentOccupancy);
      if (!Number.isFinite(occupancy) || occupancy < 0) {
        return res.status(400).json({ error: 'Occupancy must be 0 or more' });
      }
      shelter.currentOccupancy = Math.min(occupancy, shelter.capacity);
    }

    shelter.status = shelterStatus(shelter);
    await shelter.save();
    res.json(shelter);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove a shelter (Control Centre)
app.delete('/api/shelters/:id', requireRole('control'), async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid shelter id' });
  }
  try {
    const shelter = await Shelter.findByIdAndDelete(req.params.id);
    if (!shelter) {
      return res.status(404).json({ error: 'Shelter not found' });
    }
    res.json({ message: 'Shelter removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create SOS. Works with or without login, so a help request is never blocked.
// Body: { "location": { "lat", "lng" }, "village", "type" }
// Without login, "contactName" and "contactPhone" can also be sent.
app.post('/api/sos', optionalAuth, async (req, res) => {
  try {
    // Only these come from the request. Status and assignment are always set by the server.
    const { location, village, type } = req.body;
    const sos = new SOS({ location, village, type });

    const user = req.user ? await User.findById(req.user.id) : null;
    if (user) {
      sos.reportedBy = user._id;
      sos.contactName = user.name;
      sos.contactPhone = user.phone;
      if (!sos.village && user.village) {
        sos.village = user.village;
      }
    } else {
      sos.contactName = req.body.contactName || null;
      sos.contactPhone = req.body.contactPhone || null;
    }

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
app.get('/api/sos', requireRole('ngo', 'control'), async (req, res) => {
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

// A villager's own SOS requests, to see if help is coming
app.get('/api/sos/mine', requireAuth, async (req, res) => {
  try {
    const requests = await SOS.find({ reportedBy: req.user.id })
      .sort({ timestamp: -1 })
      .populate('assignedTo', 'name phone district');
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// One SOS request by id
app.get('/api/sos/:id', requireRole('ngo', 'control'), async (req, res) => {
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

// A logged-in NGO accepts an SOS for itself. No body needed: the NGO comes from the login token.
app.patch('/api/sos/:id/assign', requireRole('ngo'), async (req, res) => {
  const { id } = req.params;
  const ngoId = req.user.ngo;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid SOS id' });
  }
  if (!ngoId) {
    return res.status(403).json({ error: 'This account is not linked to an NGO' });
  }

  try {
    // Only a Pending SOS can be accepted, so two NGOs can't accept the same one
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

// The NGO handling an SOS updates it. Body: { "status": "In Progress" | "Resolved" | "Pending" }
app.patch('/api/sos/:id/status', requireRole('ngo'), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid SOS id' });
  }
  if (!SOS_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${SOS_STATUSES.join(', ')}` });
  }

  try {
    const sos = await SOS.findById(id);
    if (!sos) {
      return res.status(404).json({ error: 'SOS not found' });
    }
    if (!sos.assignedTo || sos.assignedTo.toString() !== req.user.ngo) {
      return res.status(403).json({ error: 'Only the NGO handling this SOS can update it' });
    }

    sos.status = status;
    sos.resolvedAt = status === 'Resolved' ? new Date() : null;
    if (status === 'Pending') {
      // Back to Pending means the NGO gives it up, so another NGO can accept it
      sos.assignedTo = null;
      sos.assignedAt = null;
    }

    await sos.save();
    await sos.populate('assignedTo', 'name phone district');
    res.json(sos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- EVACUATION STATUS (families report where their members went) ----------

const EVAC_FIELDS = ['inShelter', 'withRelatives', 'atHome', 'elsewhere'];

// Save my family's status (villager). Body: { totalMembers, inShelter, withRelatives, atHome, elsewhere, shelterId? }
app.post('/api/evacuation', requireRole('villager'), async (req, res) => {
  const totalMembers = Number(req.body.totalMembers);
  if (!Number.isInteger(totalMembers) || totalMembers < 1 || totalMembers > 100) {
    return res.status(400).json({ error: 'Family members must be between 1 and 100' });
  }

  const counts = {};
  for (const field of EVAC_FIELDS) {
    const value = Number(req.body[field] || 0);
    if (!Number.isInteger(value) || value < 0) {
      return res.status(400).json({ error: 'Counts must be whole numbers, 0 or more' });
    }
    counts[field] = value;
  }

  const accounted = EVAC_FIELDS.reduce((sum, field) => sum + counts[field], 0);
  if (accounted > totalMembers) {
    return res.status(400).json({ error: `That adds up to ${accounted}, but your family has ${totalMembers} members` });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let shelter = null;
    if (counts.inShelter > 0 && req.body.shelterId && mongoose.isValidObjectId(req.body.shelterId)) {
      shelter = await Shelter.findById(req.body.shelterId);
    }

    const report = await EvacuationReport.findOneAndUpdate(
      { user: user._id },
      {
        user: user._id,
        reporterName: user.name,
        reporterPhone: user.phone,
        village: user.village,
        district: user.district,
        totalMembers,
        ...counts,
        shelter: shelter ? shelter._id : null,
        shelterName: shelter ? shelter.name : null
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// My family's latest report (villager)
app.get('/api/evacuation/mine', requireAuth, async (req, res) => {
  try {
    const report = await EvacuationReport.findOne({ user: req.user.id });
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// All reports, plus totals per village (Gram Panchayat and NGOs)
app.get('/api/evacuation', requireRole('control', 'ngo'), async (req, res) => {
  try {
    const reports = await EvacuationReport.find().sort({ updatedAt: -1 });

    const byVillage = {};
    const totals = { families: 0, totalMembers: 0, inShelter: 0, withRelatives: 0, atHome: 0, elsewhere: 0, unaccounted: 0 };

    for (const report of reports) {
      const key = report.village || 'Unknown village';
      if (!byVillage[key]) {
        byVillage[key] = {
          village: key,
          district: report.district || '',
          families: 0, totalMembers: 0, inShelter: 0, withRelatives: 0, atHome: 0, elsewhere: 0, unaccounted: 0,
          lastUpdated: report.updatedAt
        };
      }
      const row = byVillage[key];
      const unaccounted = report.totalMembers - EVAC_FIELDS.reduce((sum, f) => sum + (report[f] || 0), 0);

      for (const target of [row, totals]) {
        target.families += 1;
        target.totalMembers += report.totalMembers;
        EVAC_FIELDS.forEach((f) => { target[f] += report[f] || 0; });
        target.unaccounted += Math.max(0, unaccounted);
      }
      if (report.updatedAt > row.lastUpdated) row.lastUpdated = report.updatedAt;
    }

    const villages = Object.values(byVillage).sort((a, b) => b.totalMembers - a.totalMembers);
    res.json({ totals, villages, reports });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- NGOs ----------

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

// ---------- ALERTS ----------

// Trigger an alert
// Body: { "village": "...", "district": "...", "riskLevel": "Severe", "phones": ["+91..."], "message": "(optional)" }
app.post('/api/alerts/trigger', requireRole('ngo', 'control'), async (req, res) => {
  const { village, district, riskLevel, message, phones } = req.body;

  if (!village && !district) {
    return res.status(400).json({ error: 'Please give a village or a district' });
  }
  if (!LEVEL_COLORS[riskLevel]) {
    return res.status(400).json({ error: 'riskLevel must be one of: Low, Moderate, High, Severe' });
  }

  const recipients = Array.isArray(phones) ? phones : [];

  try {
    const text = message || buildAlertMessage({ village, district, riskLevel });
    const sms = await deliverSMS(recipients, text);

    const alert = await Alert.create({
      village,
      district,
      riskLevel,
      color: LEVEL_COLORS[riskLevel],
      message: text,
      recipients,
      sms
    });

    res.status(201).json(alert);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List alerts, newest first
//   /api/alerts                  -> latest 50 alerts
//   /api/alerts?district=Udupi   -> only one district
app.get('/api/alerts', async (req, res) => {
  try {
    const filter = {};
    if (req.query.district) {
      filter.district = req.query.district;
    }
    const alerts = await Alert.find(filter)
      .collation({ locale: 'en', strength: 2 })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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

// Risk for ALL districts in one call
//   /api/risk
//   /api/risk?simulateRain=150                          -> every district gets 150 mm
//   /api/risk?simulateRain=150&simulateDistrict=Udupi   -> only Udupi gets 150 mm
const RAIN_CACHE_MS = 10 * 60 * 1000;  // 10 minutes
let rainCache = { time: 0, key: '', data: null };

app.get('/api/risk', async (req, res) => {
  try {
    const districts = await DistrictRainfall.find({ lat: { $ne: null }, lng: { $ne: null } })
      .sort({ district: 1 });
    if (districts.length === 0) {
      return res.status(404).json({ error: 'No districts with locations. Run add-district-coordinates.js' });
    }

    // Real rainfall, reused for 10 minutes
    const key = districts.map((d) => d.district).join('|');
    const cacheIsOld = Date.now() - rainCache.time > RAIN_CACHE_MS;
    if (!rainCache.data || rainCache.key !== key || cacheIsOld) {
      const data = await getRainfall24hMany(districts.map((d) => ({ lat: d.lat, lng: d.lng })));
      rainCache = { time: Date.now(), key, data };
    }

    // For demos
    const simulated = req.query.simulateRain !== undefined ? parseFloat(req.query.simulateRain) : NaN;
    const simulateDistrict = (req.query.simulateDistrict || '').toLowerCase();

    const results = districts.map((d, i) => {
      let rain = rainCache.data[i];
      const applies = !simulateDistrict || d.district.toLowerCase() === simulateDistrict;
      if (!Number.isNaN(simulated) && applies) {
        rain = { ...rain, next24h: simulated, simulated: true };
      }
      return {
        district: d.district,
        lat: d.lat,
        lng: d.lng,
        rainfall: rain,
        risk: calculateRisk(rain, d)
      };
    });

    // Highest risk first
    results.sort((a, b) => b.risk.score - a.risk.score || a.district.localeCompare(b.district));

    const summary = { green: 0, yellow: 0, orange: 0, red: 0 };
    for (const r of results) {
      summary[r.risk.color]++;
    }

    res.json({ updatedAt: new Date(rainCache.time), summary, districts: results });
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