const mongoose = require('mongoose');

const recruiterLeadSchema = new mongoose.Schema({
  companyName: { type: String, required: true },
  companyDomain: { type: String, required: true, lowercase: true, trim: true },
  
  careersEmail: { type: String, default: '', trim: true },
  publicHrEmail: { type: String, default: '', trim: true },
  contactPageUrl: { type: String, default: '', trim: true },
  linkedInCompanyUrl: { type: String, default: '', trim: true },
  
  countryCode: { type: String, required: true, uppercase: true, trim: true },
  atsUsed: { type: String, default: '', trim: true },
  activeJobCount: { type: Number, default: 0 },
  hiringLevel: { type: String, enum: ['normal', 'high', 'very_high', 'priority'], default: 'normal' },
  
  source: { type: String, default: 'ats_sync', trim: true },
  status: { type: String, enum: ['new', 'contacted', 'interested', 'not_interested'], default: 'new' }
}, { timestamps: true });

recruiterLeadSchema.index({ companyDomain: 1, countryCode: 1 }, { unique: true });
recruiterLeadSchema.index({ status: 1 });
recruiterLeadSchema.index({ hiringLevel: 1 });

module.exports = mongoose.model('RecruiterLead', recruiterLeadSchema);
