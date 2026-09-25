const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true, trim: true },  // login ID, stored as +91XXXXXXXXXX
  email: { type: String, lowercase: true, trim: true },               // optional
  // Villagers log in with OTP, so only NGO and admin accounts need a password
  passwordHash: { type: String, required: function () { return this.role !== 'villager'; } },
  role: { type: String, enum: ['villager', 'ngo', 'admin'], default: 'villager' },
  village: String,
  district: String,
  ngo: { type: mongoose.Schema.Types.ObjectId, ref: 'NGO', default: null }  // only for NGO users
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);