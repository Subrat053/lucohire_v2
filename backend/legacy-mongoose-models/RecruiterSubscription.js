const mongoose = require('mongoose');

const recruiterSubscriptionSchema = new mongoose.Schema({
  recruiterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
  planSnapshot: {
    name: { type: String, default: '' },
    slug: { type: String, default: '' },
    type: { type: String, default: 'recruiter' },
    priceMonthly: { type: Number, default: 0 },
    description: { type: String, default: '' },
    features: [{ type: String }],
    
    // Core Allowances
    unlockCredits: { type: Number, default: 0 },
    aiLimits: {
      aiJdGenerator: { type: Number, default: 0 },
      aiJdParsing: { type: Number, default: 0 },
      aiCopilot: { type: Number, default: 0 },
      interviewKits: { type: Number, default: 0 },
      jobPostLimit: { type: Number, default: 0 },
      jobBoostJobsLimit: { type: Number, default: 0 },
      jobBoostDaysLimit: { type: Number, default: 0 },
      outreachCampaigns: { type: Number, default: 0 },
      directMessaging: { type: Number, default: 0 },
      customReports: { type: Number, default: 0 },
    },

    planType: { type: String, default: 'paid' },
    billingCycle: { type: String, default: 'monthly' },
    price: { type: Number, default: 0 },
    discountedPrice: { type: Number, default: 0 },
    duration: { type: Number, default: 30 },
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
  razorpaySubscriptionId: { type: String, default: null },
  isAutoRenew: { type: Boolean, default: false },

  paymentProvider: { type: String, default: 'razorpay' },
  paymentId: { type: String, default: '' },
  orderId: { type: String, default: '' },
  finalAmount: { type: Number, default: 0 },
  currency: { type: String, default: 'INR' },
  
  priceSnapshot: {
    basePrice: { type: Number },
    discountedPrice: { type: Number },
    taxName: { type: String },
    taxPercent: { type: Number },
    taxAmount: { type: Number },
    finalAmount: { type: Number }
  },
  
  usageResetCycle: {
    type: String,
    enum: ['monthly', 'yearly', 'none'],
    default: 'monthly'
  },
  lastUsageResetAt: {
    type: Date,
    default: null
  },
}, { timestamps: true });

recruiterSubscriptionSchema.index({ recruiterId: 1, subscriptionStatus: 1, endDate: 1 });
recruiterSubscriptionSchema.index({ paymentStatus: 1, createdAt: -1 });
recruiterSubscriptionSchema.index({ planId: 1, createdAt: -1 });

module.exports = mongoose.model('RecruiterSubscription', recruiterSubscriptionSchema);
