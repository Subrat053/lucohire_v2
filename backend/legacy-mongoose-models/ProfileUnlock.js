const mongoose = require('mongoose');

/**
 * CandidateUnlock — tracks when a recruiter unlocks a provider profile.
 * Extended from original ProfileUnlock to support OTP verification, purpose, and expiry.
 */
const candidateUnlockSchema = new mongoose.Schema(
  {
    recruiterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobPost',
      default: null,
    },
    purpose: {
      type: String,
      enum: ['view_contact', 'view_resume', 'full_profile'],
      default: 'full_profile',
    },
    otpVerified: { type: Boolean, default: false },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plan',
      default: null,
    },
    // Keep original field name for backward compat
    sourcePlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plan',
      default: null,
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserSubscription',
      default: null,
    },
    unlockedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: null },
    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' },
  },
  { timestamps: true }
);

// A recruiter can unlock a given provider once (upsert pattern)
candidateUnlockSchema.index({ recruiterId: 1, providerId: 1 }, { unique: true });
candidateUnlockSchema.index({ recruiterId: 1 });
candidateUnlockSchema.index({ providerId: 1 });

module.exports = mongoose.model('ProfileUnlock', candidateUnlockSchema);
