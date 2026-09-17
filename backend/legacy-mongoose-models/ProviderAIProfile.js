const mongoose = require('mongoose');

const providerAIProfileSchema = new mongoose.Schema({
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  rawInput: { type: String, default: '', trim: true },
  generatedProfile: {
    description: { type: String, default: '' },
    skills: [{ type: String, trim: true }],
    suggestedPricingRange: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 0 },
      avg: { type: Number, default: 0 },
      currency: { type: String, default: 'INR' },
    },
    category: { type: String, default: '', trim: true },
    serviceTags: [{ type: String, trim: true }],
  },
  model: { type: String, default: '', trim: true },
  source: { type: String, enum: ['claude', 'fallback', 'manual'], default: 'fallback' },
  status: { type: String, enum: ['success', 'fallback', 'failed'], default: 'success', index: true },
  confidence: { type: Number, default: 0, min: 0, max: 1 },
  version: { type: Number, default: 1 },
}, { timestamps: true });

module.exports = mongoose.model('ProviderAIProfile', providerAIProfileSchema);
