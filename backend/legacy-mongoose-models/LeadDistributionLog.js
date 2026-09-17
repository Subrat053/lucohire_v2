const mongoose = require('mongoose');

const leadDistributionLogSchema = new mongoose.Schema({
  distributionBatchId: { type: String, required: true, trim: true, index: true },
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobPost', default: null, index: true },
  recruiterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  intentId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobSearchIntent', default: null, index: true },
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  position: { type: Number, default: 0, min: 0 },
  matchScore: { type: Number, default: 0, min: 0, max: 100 },
  reason: [{ type: String, trim: true }],
  status: { type: String, enum: ['queued', 'sent', 'accepted', 'rejected', 'expired'], default: 'queued', index: true },
}, { timestamps: true });

leadDistributionLogSchema.index({ distributionBatchId: 1, providerId: 1 }, { unique: true });

module.exports = mongoose.model('LeadDistributionLog', leadDistributionLogSchema);
