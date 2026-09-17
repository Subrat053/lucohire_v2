const mongoose = require('mongoose');

const countryConfigSchema = new mongoose.Schema({
  countryCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
  countryName: { type: String, required: true, trim: true },
  slug: { type: String, trim: true },
  currency: { type: String, required: true, uppercase: true, trim: true },
  currencySymbol: { type: String, required: true, trim: true },
  phoneCode: { type: String, trim: true },
  timezone: { type: String, trim: true },
  defaultTaxName: { type: String, default: 'GST', trim: true },
  defaultTaxPercent: { type: Number, default: 0, min: 0 },
  
  isActive: { type: Boolean, default: false }, // Default false for setup completeness verification
  isJobSyncEnabled: { type: Boolean, default: false },
  isSeoEnabled: { type: Boolean, default: false },
  isNotificationEnabled: { type: Boolean, default: false },
  isPricingEnabled: { type: Boolean, default: false },

  supportedJobSources: [{ type: String }],
  supportedAtsSources: [{ type: String }],

  defaultLanguage: { type: String, default: 'en' },
  allowedLanguages: [{ type: String }],

  salaryFormat: {
    type: { type: String, enum: ['monthly', 'yearly', 'hourly'], default: 'monthly' },
    minSalary: { type: Number, default: 0 },
    maxSalary: { type: Number, default: 0 }
  },

  jobTypes: [{ type: String }], // e.g., full_time, part_time, remote, internship
  categories: [{ type: String }],
  skills: [{ type: String }],

  seoRules: {
    generateCountryPages: { type: Boolean, default: false },
    generateCityPages: { type: Boolean, default: false },
    generateSkillPages: { type: Boolean, default: false },
    generateCategoryPages: { type: Boolean, default: false },
    minimumJobsForSeoPage: { type: Number, default: 10 }
  },

  notificationRules: {
    dailyDigestEnabled: { type: Boolean, default: false },
    jobAlertEnabled: { type: Boolean, default: false },
    whatsappEnabled: { type: Boolean, default: false },
    smsEnabled: { type: Boolean, default: false },
    emailEnabled: { type: Boolean, default: false }
  },

  pricingRules: {
    providerPlansEnabled: { type: Boolean, default: false },
    recruiterPlansEnabled: { type: Boolean, default: false },
    defaultCurrency: { type: String, default: 'USD' },
    taxName: { type: String, default: 'GST' },
    taxPercentage: { type: Number, default: 0 }
  },

  syncRules: {
    dailySyncEnabled: { type: Boolean, default: false },
    syncState: { type: String, enum: ['running', 'paused', 'stopped'], default: 'stopped' },
    syncFrequencyHours: { type: Number, default: 24 },
    maxJobsPerSource: { type: Number, default: 500 },
    maxPagesPerSource: { type: Number, default: 5 },
    inactiveJobRetentionDays: { type: Number, default: 30 }
  },

  validationStatus: { 
    type: String, 
    enum: ['draft', 'setup_incomplete', 'active', 'validation_failed'], 
    default: 'setup_incomplete' 
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Setup hooks or virtuals for aliases
countryConfigSchema.pre('save', function (next) {
  if (!this.slug && this.countryName) {
    this.slug = this.countryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  next();
});

module.exports = mongoose.model('CountryConfig', countryConfigSchema);

