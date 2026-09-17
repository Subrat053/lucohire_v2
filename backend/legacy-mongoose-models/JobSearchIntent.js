const mongoose = require('mongoose');

const jobSearchIntentSchema = new mongoose.Schema({
  rawQuery: { type: String, default: 'All Providers', trim: true },
  normalizedQuery: { type: String, default: '', trim: true, index: true },
  extractedSkill: { type: String, default: '', trim: true, index: true },
  extractedCity: { type: String, default: '', trim: true, index: true },
  extractedLocality: { type: String, default: '', trim: true },
  extractedUrgency: { type: String, enum: ['low', 'normal', 'high', 'immediate', ''], default: '' },
  extractedBudgetMin: { type: Number, default: null },
  extractedBudgetMax: { type: Number, default: null },
  extractedShiftType: { type: String, default: '', trim: true },
  extractedTimeOfDay: { type: String, default: '', trim: true },
  locationData: {
    label: { type: String, default: '' },
    city: { type: String, default: '' },
    locality: { type: String, default: '' },
    state: { type: String, default: '' },
    country: { type: String, default: '' },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
  },
  confidence: { type: Number, default: 0, min: 0, max: 1, index: true },
  sourceUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
}, { timestamps: true });

jobSearchIntentSchema.index({ extractedSkill: 1, extractedCity: 1, createdAt: -1 });
jobSearchIntentSchema.index({ rawQuery: 'text', normalizedQuery: 'text' });

module.exports = mongoose.model('JobSearchIntent', jobSearchIntentSchema);
