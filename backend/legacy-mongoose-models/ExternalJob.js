const mongoose = require('mongoose');

const externalJobSchema = new mongoose.Schema({
  externalJobId: { type: String, required: true, trim: true },
  source: { type: String, required: true, trim: true }, // e.g., adzuna, jooble, greenhouse, lever, ashby
  sourceType: { type: String, enum: ['ats', 'aggregator', 'remote', 'government'], required: true },
  jobOrigin: { type: String, enum: ['ats', 'aggregator', 'remote', 'government'], required: true },
  applyMode: { type: String, enum: ['internal_apply', 'external_redirect'], default: 'external_redirect' },
  
  companyName: { type: String, required: true, trim: true },
  companyDomain: { type: String, trim: true, default: '' },
  
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  category: { type: String, trim: true, default: '' },
  
  locationText: { type: String, trim: true, default: '' },
  city: { type: String, trim: true, default: '' },
  state: { type: String, trim: true, default: '' },
  countryCode: { type: String, required: true, uppercase: true, trim: true }, // 2-letter code
  
  salaryMin: { type: Number, default: null },
  salaryMax: { type: Number, default: null },
  currency: { type: String, uppercase: true, trim: true, default: 'USD' },
  salaryPeriod: { type: String, enum: ['hourly', 'daily', 'monthly', 'yearly'], default: 'yearly' },
  experienceRequired: { type: String, trim: true, default: '' },
  
  jobType: { type: String, default: 'full_time' }, // full_time, part_time, remote, internship
  skillsTags: [{ type: String, trim: true }],
  
  applyUrl: { type: String, required: true, trim: true },
  sourceJobUrl: { type: String, trim: true, default: '' },
  
  isActive: { type: Boolean, default: true },
  firstSeenAt: { type: Date, default: Date.now },
  lastSeenAt: { type: Date, default: Date.now },
  lastSyncedAt: { type: Date, default: Date.now },
  
  duplicateHash: { type: String, unique: true, index: true },
  seoSlug: { type: String, unique: true, index: true }
}, { timestamps: true });

// Compound indexes
externalJobSchema.index({ source: 1, externalJobId: 1 }, { unique: true });
externalJobSchema.index({ countryCode: 1, category: 1, city: 1 });
externalJobSchema.index({ skillsTags: 1 });
externalJobSchema.index({ isActive: 1 });

// Helper to pre-populate slug or hashes if not provided
externalJobSchema.pre('save', function (next) {
  if (!this.seoSlug && this.title) {
    const slugParts = [
      this.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50),
      this.companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 30),
      this.city ? this.city.toLowerCase().replace(/[^a-z0-9]+/g, '-') : '',
      this.countryCode.toLowerCase()
    ].filter(Boolean);
    
    let baseSlug = slugParts.join('-');
    baseSlug = baseSlug.replace(/(^-|-$)/g, '');
    this.seoSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`;
  }
  next();
});

module.exports = mongoose.model('ExternalJob', externalJobSchema);
