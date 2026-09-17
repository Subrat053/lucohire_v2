const mongoose = require('mongoose');

const featureFlagSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, trim: true, index: true },
  enabled: { type: Boolean, default: false, index: true },
  config: { type: mongoose.Schema.Types.Mixed, default: {} },
  scope: {
    type: String,
    enum: ['global', 'admin', 'provider', 'recruiter', 'internal'],
    default: 'global',
    index: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('FeatureFlag', featureFlagSchema);
