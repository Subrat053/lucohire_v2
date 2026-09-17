const mongoose = require('mongoose');

const providerSubscriptionSchema = new mongoose.Schema({
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
  planSnapshot: {
    name: { type: String, default: '' },
    slug: { type: String, default: '' },
    type: { type: String, default: 'provider' },
    priceMonthly: { type: Number, default: 0 },
    description: { type: String, default: '' },
    coverageType: { type: String, default: 'pincode' },
    maxSkills: { type: Number, default: 1 },
    maxPincodes: { type: Number, default: 1 },
    maxCities: { type: Number, default: 1 },
    visibilityLevel: { type: String, default: 'basic' },
    features: [{ type: String }],
    isPopular: { type: Boolean, default: false },
    priorityWeight: { type: Number, default: 0 },
    planBenefits: { type: mongoose.Schema.Types.Mixed, default: null },

    planCategory: { type: String, default: 'general' },
    planType: { type: String, default: 'paid' },
    billingCycle: { type: String, default: 'monthly' },
    price: { type: Number, default: 0 },
    discountedPrice: { type: Number, default: 0 },
    duration: { type: Number, default: 30 },
    maxJobApplications: { type: Number, default: 0 },
    usageResetCycle: { type: String, default: 'monthly' },
    isCustomisable: { type: Boolean, default: false },
    boostWeight: { type: Number, default: 0 },
    supportsWhatsappAlerts: { type: Boolean, default: false },
    supportsSmsAlerts: { type: Boolean, default: false },
    supportsPerformanceInsights: { type: Boolean, default: false },
  },

  durationMonths: { type: Number, required: true },
  subtotal: { type: Number, default: 0 },
  gstPercent: { type: Number, default: 0 },
  gstAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'cancelled'], default: 'pending' },
  subscriptionStatus: { type: String, enum: ['pending', 'active', 'expired', 'cancelled', 'paused', 'queued'], default: 'pending' },

  startDate: { type: Date, default: null },
  endDate: { type: Date, default: null },
  stripeSubscriptionId: { type: String, default: null },
  isAutoRenew: { type: Boolean, default: false },
  selectedSkills: [{ type: String }],
  selectedPincodes: [{ type: String }],
  selectedCities: [{ type: String }],
  selectedAddons: [{
    key: { type: String },
    price: { type: Number },
    description: { type: String }
  }],
  coverageLabel: { type: String, default: '' },
  visibilityLevel: { type: String, default: '' },
  paymentProvider: { type: String, default: '' },
  paymentId: { type: String, default: '' },
  orderId: { type: String, default: '' },
  priorityWeight: { type: Number, default: 0 },
  finalAmount: { type: Number, default: 0 },
  currency: { type: String, default: 'INR' },
  priceSnapshot: {
    countryCode: { type: String, uppercase: true, trim: true },
    countryName: { type: String, trim: true },
    currency: { type: String, uppercase: true, trim: true },
    basePrice: { type: Number },
    discountedPrice: { type: Number },
    taxName: { type: String },
    taxPercent: { type: Number },
    taxAmount: { type: Number },
    finalAmount: { type: Number }
  },
  customConfig: { type: Object, default: null },
  benefits: { type: mongoose.Schema.Types.Mixed, default: null },
  remainingDurationMs: { type: Number, default: 0 },

  planCategory: {
    type: String,
    enum: [
      'default_free',
      'multiple_skills',
      'locality_top',
      'city_top',
      'country_top',
      'custom',
      'general'
    ],
    default: 'general'
  },
  usageResetCycle: {
    type: String,
    enum: ['monthly', 'yearly', 'none'],
    default: 'monthly'
  },
  maxJobApplications: { type: Number, default: 0 },
  customLimits: {
    maxSkills: { type: Number, default: null },
    maxPincodes: { type: Number, default: null },
    maxCities: { type: Number, default: null },
    maxJobApplications: { type: Number, default: null },
    visibilityLevel: { type: String, default: null },
    coverageType: { type: String, default: null },
    durationMonths: { type: Number, default: null },
    selectedSkills: [{ type: String }],
    selectedCities: [{ type: String }],
    selectedPincodes: [{ type: String }]
  },
}, { timestamps: true });


providerSubscriptionSchema.index({ providerId: 1, subscriptionStatus: 1, endDate: 1 });
providerSubscriptionSchema.index({ paymentStatus: 1, createdAt: -1 });
providerSubscriptionSchema.index({ planId: 1, createdAt: -1 });

module.exports = mongoose.model('ProviderSubscription', providerSubscriptionSchema);
