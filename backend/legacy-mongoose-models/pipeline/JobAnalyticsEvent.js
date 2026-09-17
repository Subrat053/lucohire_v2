const mongoose = require('mongoose');

const jobAnalyticsEventSchema = new mongoose.Schema({
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobPost', required: true },
  eventType: { type: String, enum: ['impression', 'view', 'apply_click', 'save', 'share'], required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  sessionId: { type: String, default: null },
  country: { type: String, default: null },
  city: { type: String, default: null },
  device: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('JobAnalyticsEvent', jobAnalyticsEventSchema);
