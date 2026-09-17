const mongoose = require('mongoose');

const providerMetricsSchema = new mongoose.Schema({
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  avgResponseSeconds: { type: Number, default: 0, min: 0 },
  acceptanceRate: { type: Number, default: 0, min: 0, max: 1 },
  rejectionRate: { type: Number, default: 0, min: 0, max: 1 },
  hireConversionRate: { type: Number, default: 0, min: 0, max: 1 },
  profileCompletionScore: { type: Number, default: 0, min: 0, max: 100 },
  trustScore: { type: Number, default: 0, min: 0, max: 100 },
  rankingScore: { type: Number, default: 0, min: 0, max: 100 },
  lastLeadAssignedAt: { type: Date, default: null },
  totalAssignedLeads: { type: Number, default: 0, min: 0 },
  totalAcceptedLeads: { type: Number, default: 0, min: 0 },
  totalCompletedDeals: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

providerMetricsSchema.index({ providerId: 1, rankingScore: -1 });

module.exports = mongoose.model('ProviderMetrics', providerMetricsSchema);
