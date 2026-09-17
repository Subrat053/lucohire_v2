const mongoose = require('mongoose');

const companyMasterSchema = new mongoose.Schema({
  companyName: { type: String, required: true },
  externalId: { type: String, required: true }, // CIN, ACN, Company Number
  source: { type: String, required: true }, // mca_india, companies_house_uk
  status: { type: String, required: true }, // active, inactive
  countryCode: { type: String, required: true },
  
  // Optional enriched fields
  companyDomain: { type: String, default: '' },
  industry: { type: String, default: '' },
  employeeCount: { type: Number, default: 0 },
  
  isActive: { type: Boolean, default: true },
  lastSyncedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Dedup key: (externalId + source)
companyMasterSchema.index({ externalId: 1, source: 1 }, { unique: true });
companyMasterSchema.index({ companyName: 1 });
companyMasterSchema.index({ countryCode: 1 });

module.exports = mongoose.model('CompanyMaster', companyMasterSchema);
