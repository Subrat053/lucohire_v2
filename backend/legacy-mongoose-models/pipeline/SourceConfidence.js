const mongoose = require('mongoose');

const sourceConfidenceSchema = new mongoose.Schema({
  sourceName: { type: String, required: true },
  sourceType: { type: String, required: true },
  confidenceScore: { type: Number, required: true, default: 50 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('SourceConfidence', sourceConfidenceSchema);
