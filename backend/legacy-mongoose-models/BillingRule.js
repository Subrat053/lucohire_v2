const mongoose = require('mongoose');

/**
 * BillingRule — versioned document that governs all platform billing calculations.
 *
 * Every time an admin updates billing rules:
 *   1. The current active rule is marked isActive = false
 *   2. A new rule with version + 1 is created with isActive = true
 *
 * Transactions store a billingRuleSnapshot so old records are never affected
 * by future rule changes.
 */
const billingRuleSchema = new mongoose.Schema(
  {
    // ── Platform Commission ──────────────────────────────────────────────────
    platformCommissionPercentage: {
      type: Number,
      default: 30,
      min: 0,
      max: 100,
    },

    // ── Referral Commission ──────────────────────────────────────────────────
    referralEnabled: {
      type: Boolean,
      default: false,
    },
    referralCommissionType: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'percentage',
    },
    referralCommissionValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    referralMaxCap: {
      type: Number,
      default: 0,   // 0 = no cap
      min: 0,
    },

    // ── Cashback Reward ──────────────────────────────────────────────────────
    cashbackEnabled: {
      type: Boolean,
      default: false,
    },
    cashbackType: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'percentage',
    },
    cashbackValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    cashbackMaxCap: {
      type: Number,
      default: 0,   // 0 = no cap
      min: 0,
    },
    cashbackMinTransactionAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ── Withdrawal Rules ─────────────────────────────────────────────────────
    minPayoutThreshold: {
      type: Number,
      default: 500,
      min: 0,
    },
    fixedWithdrawalFee: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ── Versioning ───────────────────────────────────────────────────────────
    version: {
      type: Number,
      default: 1,
    },
    effectiveFrom: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // ── Audit ────────────────────────────────────────────────────────────────
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    changeReason: {
      type: String,
      default: '',
      trim: true,
    },

    // ── Legacy compat (read-only snapshot of what old keys held at creation) ─
    legacyUserReferralCommissionPercentage: {
      type: Number,
      default: null,
    },

    // ── Country Specific Taxes ───────────────────────────────────────────────
    countryGst: [
      {
        country: {
          type: String,
          required: true,
          uppercase: true,
          trim: true
        },
        gstPercent: {
          type: Number,
          required: true,
          min: 0,
          max: 100
        }
      }
    ]
  },
  { timestamps: true }
);

billingRuleSchema.index({ isActive: 1, version: -1 });
billingRuleSchema.index({ effectiveFrom: -1 });

// Static helper — get the currently active rule
billingRuleSchema.statics.getActive = async function () {
  return this.findOne({ isActive: true }).sort({ version: -1 });
};

module.exports = mongoose.model('BillingRule', billingRuleSchema);
