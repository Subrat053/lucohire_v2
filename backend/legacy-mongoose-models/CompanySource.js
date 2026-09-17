const mongoose = require('mongoose');

const companySourceSchema = new mongoose.Schema({
  companyName: { type: String, required: true, trim: true },
  companyDomain: { type: String, required: true, lowercase: true, trim: true },
  careerUrl: { type: String, trim: true, default: '' },
  
  atsType: { 
    type: String, 
    enum: ['greenhouse', 'lever', 'ashby', 'workable', 'unknown'], 
    default: 'unknown' 
  },
  atsIdentifier: { type: String, trim: true, default: '' }, // e.g. company slug on ATS
  
  countryCode: { type: String, required: true, uppercase: true, trim: true }, // ISO 2-letter
  source: { type: String, default: 'manual', trim: true }, // manual, import, google, github, etc.
  
  status: { type: String, enum: ['active', 'inactive', 'needs_review'], default: 'active' },
  
  failureCount: { type: Number, default: 0 },
  successCount: { type: Number, default: 0 },
  
  lastCheckedAt: { type: Date, default: null },
  lastSyncedAt: { type: Date, default: null },
  lastError: { type: String, default: '' },
  
  activeJobCount: { type: Number, default: 0 },
  hiringLevel: { type: String, enum: ['normal', 'high', 'very_high', 'priority'], default: 'normal' }
}, { timestamps: true });

// Ensure unique companies per domain and country
companySourceSchema.index({ companyDomain: 1, countryCode: 1 }, { unique: true });
companySourceSchema.index({ status: 1 });
companySourceSchema.index({ atsType: 1 });

module.exports = mongoose.model('CompanySource', companySourceSchema);
