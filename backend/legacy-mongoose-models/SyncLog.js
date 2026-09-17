const mongoose = require('mongoose');

const syncLogSchema = new mongoose.Schema({
  syncType: { 
    type: String, 
    enum: ['ats', 'global_source', 'company_discovery', 'cleanup'], 
    required: true 
  },
  source: { type: String, required: true },
  countryCode: { type: String, uppercase: true },
  
  status: { type: String, enum: ['success', 'failed', 'partial'], required: true },
  startedAt: { type: Date, required: true },
  completedAt: { type: Date },
  
  jobsFetched: { type: Number, default: 0 },
  jobsInserted: { type: Number, default: 0 },
  jobsUpdated: { type: Number, default: 0 },
  jobsDeactivated: { type: Number, default: 0 },
  duplicatesSkipped: { type: Number, default: 0 },
  
  companiesChecked: { type: Number, default: 0 },
  companiesAdded: { type: Number, default: 0 },
  
  errorMessage: { type: String, default: '' },
  errorDetails: { type: mongoose.Schema.Types.Mixed, default: null }
}, { timestamps: true });

syncLogSchema.index({ startedAt: -1 });
syncLogSchema.index({ source: 1, status: 1 });

module.exports = mongoose.model('SyncLog', syncLogSchema);
