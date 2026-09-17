const mongoose = require('mongoose');

const jsearchScanRunSchema = new mongoose.Schema({
  scanType: { type: String, enum: ['scheduled', 'manual'], required: true },
  countryCode: { type: String, required: true },
  query: { type: String, required: true },
  location: { type: String, required: true },
  status: { type: String, enum: ['pending', 'running', 'success', 'partial_failed', 'failed'], default: 'pending' },
  startedAt: { type: Date, default: Date.now },
  finishedAt: { type: Date, default: null },
  totalFetched: { type: Number, default: 0 },
  totalSavedRaw: { type: Number, default: 0 },
  totalValidated: { type: Number, default: 0 },
  totalPublished: { type: Number, default: 0 },
  totalFailed: { type: Number, default: 0 },
  retryCount: { type: Number, default: 0 },
  errorMessage: { type: String, default: null },
  triggeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // null if system scheduled
  rawMeta: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

module.exports = mongoose.model('JSearchScanRun', jsearchScanRunSchema);
