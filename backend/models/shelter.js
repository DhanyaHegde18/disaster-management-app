const mongoose = require('mongoose');

const shelterSchema = new mongoose.Schema({
  name: String,
  lat: Number,
  lng: Number,
  capacity: Number,
  currentOccupancy: { type: Number, default: 0 },
  status: { type: String, enum: ['Available', 'Full'], default: 'Available' }
});

module.exports = mongoose.model('Shelter', shelterSchema);