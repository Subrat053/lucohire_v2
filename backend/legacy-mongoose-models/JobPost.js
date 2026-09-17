const mongoose = require('mongoose');

const jobPostSchema = new mongoose.Schema({
  recruiter: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Optional for external jobs
  isExternal: { type: Boolean, default: false },
  externalJobId: { type: String, trim: true }, // from ExternalJob
  source: { type: String, default: 'internal' }, // e.g., 'adzuna', 'jooble', 'internal', 'jsearch'
  sourceType: { type: String, default: 'internal' },
  jobOrigin: { type: String, default: 'internal' },
  applyMode: { type: String, enum: ['internal_apply', 'external_redirect'], default: 'internal_apply' },
  externalUrl: { type: String, trim: true },
  applyUrl: { type: String, trim: true, default: '' },
  sourceJobUrl: { type: String, trim: true, default: '' },
  nativeLanguage: { type: String, default: 'en' },
  title: { type: String, required: true, trim: true },
  skill: { type: String, trim: true, default: '' }, // Made optional for external
  category: { type: String, trim: true, default: '' }, // from ExternalJob
  experienceRequired: { type: String, trim: true, default: '' },
  requiredSkillLevel: { type: String, enum: ['unskilled', 'semi-skilled', 'skilled'], default: 'semi-skilled' },
  speciality: { type: String, default: '', trim: true },
  city: { type: String, trim: true, default: '' }, // Made optional for remote external jobs
  locationText: { type: String, trim: true, default: '' }, // from ExternalJob
  locality: { type: String, default: '', trim: true },
  workMode: { type: String, enum: ['onsite', 'remote', 'hybrid', 'travel'], default: 'onsite' },
  jobType: { type: String, default: 'full_time' }, // full_time, part_time, remote, internship
  relocationSupport: { type: Boolean, default: false },
  budget: {
    perHour: { type: Number, default: 0 },
    perDay: { type: Number, default: 0 },
    perMonth: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    source: { type: String, default: 'manual' },
  },
  urgency: { type: String, enum: ['low', 'normal', 'high', 'immediate'], default: 'normal', index: true },
  scheduleType: { type: String, enum: ['one_time', 'part_time', 'full_time', 'flexible', 'shift'], default: 'flexible' },
  timeOfDay: { type: String, enum: ['morning', 'afternoon', 'evening', 'night', 'any'], default: 'any' },
  geoPoint: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      default: null,
    },
  },
  location: {
    placeId: { type: String, default: '' },
    name: { type: String, default: '' },
    formattedAddress: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    country: { type: String, default: '' },
    postalCode: { type: String, default: '' },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    source: { type: String, default: 'google_places' },
  },
  locationData: { type: Object, default: null },
  jobLocationData: { type: Object, default: null },

  geoPoint: {
    type: {
      type: String,
      enum: ['Point'],
      default: undefined,
    },
    coordinates: {
      type: [Number],
      default: undefined,
    },
  },

  budgetMin: { type: Number, default: 0 },
  budgetMax: { type: Number, default: 0 },
  budgetType: { type: String, enum: ['fixed', 'hourly', 'monthly', 'negotiable', 'yearly', 'daily'], default: 'negotiable' },
  salaryPeriod: { type: String, enum: ['hourly', 'daily', 'monthly', 'yearly'], default: 'yearly' }, // from ExternalJob
  currency: { type: String, uppercase: true, trim: true, default: 'INR' },
  description: { type: String, required: true },
  companyName: { type: String, default: '' },
  companyDomain: { type: String, trim: true, default: '' },
  companyInfo: { type: String, default: '' },
  requirements: [{ type: String }],
  skillsTags: [{ type: String, trim: true }], // from ExternalJob
  status: { type: String, enum: ['active', 'closed', 'expired', 'draft', 'deleted'], default: 'active' },
  aiGenerated: {
    isGenerated: { type: Boolean, default: false },
    source: { type: String, default: '' },
    model: { type: String, default: '' },
    generatedAt: { type: Date, default: null },
    confidence: { type: Number, default: 0, min: 0, max: 1 },
  },
  embedding: { type: mongoose.Schema.Types.Mixed, default: null },
  embeddingText: { type: String, default: '' },
  matchRadiusUsed: { type: Number, default: 0 },
  applicants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  matchedProviders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ProviderProfile' }],
  candidates: [{
    providerProfile: { type: mongoose.Schema.Types.ObjectId, ref: 'ProviderProfile' },
    addedAt: { type: Date, default: Date.now },
  }],
  expiresAt: { type: Date },

  latitude: { type: Number },
  longitude: { type: Number },
  cityName: { type: String, trim: true },
  countryCode: { type: String, trim: true },
  minBudget: { type: Number },
  maxBudget: { type: Number },
  pricingType: { type: String, enum: ["hourly", "daily", "fixed", "monthly", "gig"] },
  isActive: { type: Boolean, default: true },
  
  // Scraper/External Data tracking
  firstSeenAt: { type: Date, default: Date.now },
  lastSeenAt: { type: Date, default: Date.now },
  lastSyncedAt: { type: Date, default: Date.now },
  duplicateHash: { type: String, index: true },
  seoSlug: { type: String, index: true },
  
  // Boosting
  isBoosted: { type: Boolean, default: false },
  boostedAt: { type: Date, default: null },
  boostExpiresAt: { type: Date, default: null },
}, { timestamps: true });

jobPostSchema.index({ skill: 1, city: 1 });
jobPostSchema.index({ recruiter: 1 });
jobPostSchema.pre('save', function normalizeGeoPoint(next) {
  if (this.location) {
    if (typeof this.location.latitude === 'number' && this.latitude === undefined) this.latitude = this.location.latitude;
    if (typeof this.location.longitude === 'number' && this.longitude === undefined) this.longitude = this.location.longitude;
    if (this.location.city && !this.cityName) this.cityName = this.location.city;
    if (this.location.country && !this.countryCode) this.countryCode = this.location.country;
  }
  if (!this.cityName && this.city) {
    this.cityName = this.city;
  }
  
  if (this.budgetMin !== undefined && this.minBudget === undefined) this.minBudget = this.budgetMin;
  if (this.budgetMax !== undefined && this.maxBudget === undefined) this.maxBudget = this.budgetMax;
  
  if (this.budgetType && !this.pricingType) {
    if (this.budgetType === 'hourly') this.pricingType = 'hourly';
    else if (this.budgetType === 'monthly') this.pricingType = 'monthly';
    else if (this.budgetType === 'fixed') this.pricingType = 'fixed';
    else this.pricingType = 'fixed'; // Fallback
  }

  this.isActive = this.status === 'active';

  const lat = Number(this.latitude !== undefined && this.latitude !== null ? this.latitude : (this.location?.latitude || this.locationData?.latitude || this.jobLocationData?.latitude));
  const lng = Number(this.longitude !== undefined && this.longitude !== null ? this.longitude : (this.location?.longitude || this.locationData?.longitude || this.jobLocationData?.longitude));

  const hasValidCoordinates = Number.isFinite(lat)
    && Number.isFinite(lng)
    && lat >= -90
    && lat <= 90
    && lng >= -180
    && lng <= 180;

  if (hasValidCoordinates) {
    this.latitude = lat;
    this.longitude = lng;
    this.geoPoint = {
      type: 'Point',
      coordinates: [lng, lat],
    };
  } else {
    this.geoPoint = undefined;
  }

  next();
});

jobPostSchema.index({ geoPoint: '2dsphere' }, { sparse: true });
jobPostSchema.index({ externalUrl: 1 }, { unique: true, sparse: true });

// Compound indexes
jobPostSchema.index({ source: 1, externalJobId: 1 });
jobPostSchema.index({ countryCode: 1, category: 1, city: 1 });
jobPostSchema.index({ skillsTags: 1 });

// Helper to pre-populate slug or hashes if not provided
jobPostSchema.pre('save', function (next) {
  if (!this.seoSlug && this.title && this.isExternal) {
    const slugParts = [
      this.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50),
      this.companyName ? this.companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 30) : '',
      this.city ? this.city.toLowerCase().replace(/[^a-z0-9]+/g, '-') : '',
      this.countryCode ? this.countryCode.toLowerCase() : ''
    ].filter(Boolean);
    
    let baseSlug = slugParts.join('-');
    baseSlug = baseSlug.replace(/(^-|-$)/g, '');
    this.seoSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`;
  }
  next();
});

module.exports = mongoose.model('JobPost', jobPostSchema);
