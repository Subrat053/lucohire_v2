const mongoose = require('mongoose');

const countryPipelineConfigSchema = new mongoose.Schema({
  countryCode: { type: String, required: true, unique: true }, // e.g. IN, US
  countryName: { type: String, required: true },
  isEnabled: { type: Boolean, default: false },
  defaultLanguage: { type: String, default: 'en' },
  defaultLocations: [{ type: String }],
  dailyQueryLimit: { type: Number, default: 50 },
  scheduleEnabled: { type: Boolean, default: true },
  scheduleCron: { type: String, default: '0 1 * * *' },
  seedQueries: [{
    query: { type: String, required: true },
    location: { type: String, required: true },
    isEnabled: { type: Boolean, default: true },
    sourceType: { type: String, enum: ['fixed_seed', 'google_trends', 'google_autocomplete', 'manual', 'historical_success'], default: 'manual' },
    lastRunAt: { type: Date, default: null },
    lastStatus: { type: String, enum: ['success', 'failed', 'pending', null], default: null }
  }]
}, { timestamps: true });

module.exports = mongoose.model('CountryPipelineConfig', countryPipelineConfigSchema);
