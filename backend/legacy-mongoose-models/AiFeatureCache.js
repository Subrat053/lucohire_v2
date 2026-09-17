const mongoose = require('mongoose');

const aiFeatureCacheSchema = new mongoose.Schema({
  fileHash: {
    type: String,
    required: true,
    index: true,
  },
  featureName: {
    type: String,
    required: true,
    index: true,
  },
  reportData: {
    type: Object,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 30 * 24 * 60 * 60, // 30 days TTL
  },
});

aiFeatureCacheSchema.index({ fileHash: 1, featureName: 1 }, { unique: true });

module.exports = mongoose.model('AiFeatureCache', aiFeatureCacheSchema);
