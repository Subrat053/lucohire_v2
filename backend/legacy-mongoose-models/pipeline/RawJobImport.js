const mongoose = require('mongoose');

const rawJobImportSchema = new mongoose.Schema({
  scanRunId: { type: mongoose.Schema.Types.ObjectId, ref: 'JSearchScanRun', required: true },
  countryCode: { type: String, required: true },
  query: { type: String, required: true },
  location: { type: String, required: true },
  sourceName: { type: String, default: 'JSearch' },
  sourceType: { type: String, default: 'aggregated' }, // 'aggregated', 'direct', 'ats', 'company_career'
  sourceConfidenceScore: { type: Number, default: 90 },
  jsearchJobId: { type: String, required: true },
  sourceJobId: { type: String, default: null },
  applyUrl: { type: String, default: null },
  sourceApplyUrl: { type: String, default: null },
  requisitionId: { type: String, default: null },
  rawTitle: { type: String, default: null },
  rawCompanyName: { type: String, default: null },
  rawLocation: { type: String, default: null },
  rawDescription: { type: String, default: null },
  rawSalary: { type: String, default: null },
  rawPostedDate: { type: Date, default: null },
  rawJobType: { type: String, default: null },
  rawEmploymentType: { type: String, default: null },
  rawPayload: { type: mongoose.Schema.Types.Mixed, default: {} },
  processingStatus: { type: String, enum: ['raw', 'normalized', 'validation_failed', 'published', 'duplicate', 'expired', 'needs_review'], default: 'raw' },
  validationErrors: [{ type: String }],
  firstFetchedAt: { type: Date, default: Date.now },
  lastFetchedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('RawJobImport', rawJobImportSchema);
