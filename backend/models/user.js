const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true, trim: true },  // login ID, stored as +91XXXXXXXXXX
  role: { type: String, enum: ['villager', 'ngo'], default: 'villager' },
  village: String,
  district: String,
  ngo: { type: mongoose.Schema.Types.ObjectId, ref: 'NGO', default: null }  // only for NGO users
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);