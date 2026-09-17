const mongoose = require('mongoose');

const aiFeatureControlSchema = new mongoose.Schema(
  {
    featureKey: { type: String, required: true, unique: true, index: true },
    featureName: { type: String, required: true },
    audience: { type: String, enum: ['candidate', 'recruiter', 'system'], required: true, index: true },
    defaultModel: { type: String, default: 'gpt-4o-mini' },
    status: { type: String, enum: ['active', 'paused', 'stopped'], default: 'active' },
    unitCostInr: { type: Number, default: 0.15 }, // One-time execution cost per model call in ₹
    lastUpdatedBy: { type: String, default: 'admin' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AiFeatureControl', aiFeatureControlSchema);
