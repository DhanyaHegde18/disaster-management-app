const mongoose = require('mongoose');

const sosSchema = new mongoose.Schema({
  location: {
    lat: Number,
    lng: Number
  },
  village: String,
  type: { type: String, enum: ['Flood', 'Landslide', 'Medical', 'Other'] },
  status: { type: String, enum: ['Pending', 'In Progress', 'Resolved'], default: 'Pending' },
  timestamp: { type: Date, default: Date.now },

  // New: which NGO is handling it, and when
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'NGO', default: null },
  assignedAt: { type: Date, default: null },
  resolvedAt: { type: Date, default: null },

  // Who sent it (filled in automatically if a villager is logged in)
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  contactName: { type: String, default: null },
  contactPhone: { type: String, default: null }
});

module.exports = mongoose.model('SOS', sosSchema);