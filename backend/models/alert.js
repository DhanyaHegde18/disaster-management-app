const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  village: String,
  district: String,
  riskLevel: { type: String, enum: ['Low', 'Moderate', 'High', 'Severe'], required: true },
  color: String,
  message: { type: String, required: true },
  recipients: [String],  // phone numbers the SMS is meant for
  sms: {
    mode: { type: String, enum: ['simulated', 'live'], default: 'simulated' },
    sent: { type: Number, default: 0 },
    failed: { type: Number, default: 0 }
  }
}, { timestamps: true });

module.exports = mongoose.model('Alert', alertSchema);