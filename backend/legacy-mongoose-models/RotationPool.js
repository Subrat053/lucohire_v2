const mongoose = require('mongoose');

const rotationPoolSchema = new mongoose.Schema({
  skill: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  providers: [{
    provider: { type: mongoose.Schema.Types.ObjectId, ref: 'ProviderProfile' },
    lastShown: { type: Date, default: new Date(0) },
    weight: { type: Number, default: 1 },
  }],
  maxPoolSize: { type: Number, default: 5 },
  rotationInterval: { type: Number, default: 60 }, // seconds
  currentIndex: { type: Number, default: 0 },
  status: { type: String, enum: ['running', 'paused', 'stopped'], default: 'running' },
  rotationStrategy: {
    type: String,
    enum: ['round_robin', 'weighted_random', 'fair_distribution', 'priority_boost'],
    default: 'round_robin'
  },
  history: [{
    action: { type: String, required: true },
    details: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

rotationPoolSchema.index({ skill: 1, city: 1 }, { unique: true });

module.exports = mongoose.model('RotationPool', rotationPoolSchema);
