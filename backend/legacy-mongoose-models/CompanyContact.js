const mongoose = require('mongoose');

const companyContactSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyMaster', required: true },
  companyDomain: { type: String, required: true, trim: true, lowercase: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  sourcePage: { type: String, trim: true, default: '' },
  confidenceScore: { type: Number, min: 0, max: 100, default: 50 },
  source: { type: String, required: true, trim: true }, // e.g., 'hunter.io', 'crawler_regex'
  isActive: { type: Boolean, default: true },
  lastVerifiedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Dedupe Key: company_id + email
companyContactSchema.index({ companyId: 1, email: 1 }, { unique: true });

module.exports = mongoose.model('CompanyContact', companyContactSchema);
