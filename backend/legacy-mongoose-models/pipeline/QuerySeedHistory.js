const mongoose = require('mongoose');

const querySeedHistorySchema = new mongoose.Schema({
  countryCode: { type: String, required: true },
  rawTerm: { type: String, required: true },
  normalizedQuery: { type: String, required: true },
  location: { type: String, required: true },
  sourceType: { type: String, enum: ['google_trends', 'google_autocomplete', 'fixed_seed', 'manual', 'historical_success'], required: true },
  status: { type: String, enum: ['pending', 'used', 'failed', 'ignored'], default: 'pending' },
  failureReason: { type: String, default: null },
  lastUsedAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('QuerySeedHistory', querySeedHistorySchema);
