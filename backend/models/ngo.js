const mongoose = require('mongoose');

const ngoSchema = new mongoose.Schema({
  name: { type: String, required: true },
  contactPerson: String,
  phone: { type: String, required: true },
  email: String,
  district: String,
  location: {
    lat: Number,
    lng: Number
  },
  services: [String],  // e.g. ['Rescue', 'Medical', 'Food', 'Shelter']
  available: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('NGO', ngoSchema);