const mongoose = require('mongoose');

const providerUsageSchema = new mongoose.Schema({
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProviderSubscription',
    required: true
  },
  periodStart: {
    type: Date,
    required: true
  },
  periodEnd: {
    type: Date,
    required: true
  },
  skillsUsed: {
    type: Number,
    default: 0
  },
  locationsUsed: {
    type: Number,
    default: 0
  },
  jobApplicationsUsed: {
    type: Number,
    default: 0
  },
  cityCoverageUsed: {
    type: Number,
    default: 0
  },
  pincodeCoverageUsed: {
    type: Number,
    default: 0
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true });

// Ensure unique index for a provider's subscription usage period
providerUsageSchema.index(
  { providerId: 1, subscriptionId: 1, periodStart: 1, periodEnd: 1 },
  { unique: true }
);

module.exports = mongoose.model('ProviderUsage', providerUsageSchema);
