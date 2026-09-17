const mongoose = require('mongoose');

const jobAnalyticsMetricSchema = new mongoose.Schema({
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobPost', required: true, unique: true },
  impressions: { type: Number, default: 0 },
  views: { type: Number, default: 0 },
  applyClicks: { type: Number, default: 0 },
  trendingScore: { type: Number, default: 0 },
  activeViewerCount: { type: Number, default: 0 },
  calculatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('JobAnalyticsMetric', jobAnalyticsMetricSchema);
