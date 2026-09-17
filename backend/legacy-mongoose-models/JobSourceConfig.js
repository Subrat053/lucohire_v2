const mongoose = require('mongoose');

const jobSourceConfigSchema = new mongoose.Schema({
  sourceName: { type: String, required: true, unique: true, trim: true }, // greenhouse, lever, ashby, adzuna, jooble, usajobs, themuse, remoteok, remotive, workable, etc.
  sourceType: { type: String, enum: ['ats', 'aggregator', 'government', 'remote'], required: true },
  isActive: { type: Boolean, default: false },
  
  supportedCountries: [{ type: String, uppercase: true, trim: true }], // IN, US, GB, CA, AU, AE, etc.
  
  requiresApiKey: { type: Boolean, default: false },
  apiCredentialsRef: { type: String, default: '', trim: true }, // e.g. "ADZUNA_API_KEY" or env name
  
  // --- Zero-Code Dynamic Fields ---
  isZeroCode: { type: Boolean, default: false },
  apiBaseUrl: { type: String, default: '' },
  authType: { type: String, enum: ['No auth', 'API key', 'Bearer token', 'Basic auth', 'Custom header', 'Webhook'], default: 'No auth' },
  webhookUrl: { type: String, default: '' },
  inputSchemaJson: { type: Object, default: {} }, // e.g. { pagination: 'offset', resultsKey: 'data' }
  outputMappingJson: { type: Object, default: {} }, // e.g. { title: 'job_title', companyName: 'company.name' }
  // --------------------------------
  
  rateLimit: {
    delayMs: { type: Number, default: 1000 },
    maxRequestsPerHour: { type: Number, default: 100 }
  },
  
  syncRules: {
    enabled: { type: Boolean, default: true },
    frequencyHours: { type: Number, default: 24 },
    maxPages: { type: Number, default: 5 },
    maxJobs: { type: Number, default: 100 }
  },
  
  lastSyncAt: { type: Date, default: null },
  lastError: { type: String, default: '' },
  failureCount: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'paused', 'failed', 'needs_review'], default: 'paused' }
}, { timestamps: true });

module.exports = mongoose.model('JobSourceConfig', jobSourceConfigSchema);
