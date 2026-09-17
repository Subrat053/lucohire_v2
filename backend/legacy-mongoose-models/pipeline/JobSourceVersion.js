const mongoose = require('mongoose');

const jobSourceVersionSchema = new mongoose.Schema({
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobPost', required: true },
  duplicateGroupId: { type: mongoose.Schema.Types.ObjectId, ref: 'DuplicateGroup', default: null },
  sourceName: { type: String, required: true },
  sourceType: { type: String, required: true },
  sourceConfidenceScore: { type: Number, default: 0 },
  sourceJobId: { type: String, default: null },
  applyUrl: { type: String, required: true },
  requisitionId: { type: String, default: null },
  rawPayload: { type: mongoose.Schema.Types.Mixed, default: {} },
  completenessScore: { type: Number, default: 0 },
  freshnessScore: { type: Number, default: 0 },
  isCanonical: { type: Boolean, default: false },
  firstSeenAt: { type: Date, default: Date.now },
  lastSeenAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('JobSourceVersion', jobSourceVersionSchema);
