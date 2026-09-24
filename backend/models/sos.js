const mongoose = require('mongoose');

const sosSchema = new mongoose.Schema({
  location: {
    lat: Number,
    lng: Number
  },
  village: String,
  type: { type: String, enum: ['Flood', 'Landslide', 'Medical', 'Other'] },
  status: { type: String, enum: ['Pending', 'In Progress', 'Resolved'], default: 'Pending' },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SOS', sosSchema);