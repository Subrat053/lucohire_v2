const mongoose = require("mongoose");
const User = require("./User");
const Plan = require("./Plan");

const userSubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: { type: String, enum: ["provider", "recruiter"], required: true },
    audience: { type: String, enum: ["provider", "recruiter"], default: null },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: false,
    },
    planCode: { type: String, default: "" },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, required: true },
    startedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    billingCycle: { type: String, default: "" },
    amount: { type: Number, default: 0 },
    gstAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    paymentStatus: { type: String, default: "" },
    paymentId: { type: String, default: "" },
    status: {
      type: String,
      enum: ["active", "expired", "cancelled", "pending_payment"],
      default: "active",
    },
    isDefault: { type: Boolean, default: false },
    autoRenew: { type: Boolean, default: false },
    unlockCreditsTotal: { type: Number, default: 0 },
    unlockCreditsUsed: { type: Number, default: 0 },
    unlockCreditsRemaining: { type: Number, default: 0 },
    expiryDate: { type: Date, default: null },
    usage: {
      contactsViewed: { type: Number, default: 0 },
      downloadsUsed: { type: Number, default: 0 },
      skillsUsed: { type: Number, default: 0 },
      pincodesUsed: { type: Number, default: 0 },
      jobsBoosted: { type: Number, default: 0 },
    },
    boostMeta: {
      boostEnabled: { type: Boolean, default: false },
      boostWeight: { type: Number, default: 0 },
      boostSource: { type: String, default: "" },
      boostExpiresAt: { type: Date, default: null },
    },
    priorityWeight: { type: Number, default: 0 },
    durationMonths: { type: Number, default: 1 },
    monthlyPrice: { type: Number, default: 0 },
    discountPercent: { type: Number, default: 0 },
    finalAmount: { type: Number, default: 0 },
    currency: { type: String, default: "INR" },
    priceSnapshot: {
      countryCode: { type: String, uppercase: true, trim: true },
      countryName: { type: String, trim: true },
      currency: { type: String, uppercase: true, trim: true },
      basePrice: { type: Number },
      discountedPrice: { type: Number },
      taxName: { type: String },
      taxPercent: { type: Number },
      taxAmount: { type: Number },
      finalAmount: { type: Number },
    },

    // Billing rule snapshot & calculations
    billingRuleSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
    platformCommissionAmount: { type: Number, default: 0 },
    providerShareAmount: { type: Number, default: 0 },
    referralCommissionAmount: { type: Number, default: 0 },
    cashbackAmount: { type: Number, default: 0 },
    netPlatformRevenue: { type: Number, default: 0 },
  },
  { timestamps: true },
);

userSubscriptionSchema.pre("validate", function normalizeFields(next) {
  if (!this.audience) this.audience = this.role;
  if (!this.startedAt) this.startedAt = this.startDate;
  if (!this.expiresAt) this.expiresAt = this.endDate;
  next();
});

userSubscriptionSchema.index({ userId: 1, role: 1, status: 1 });
userSubscriptionSchema.index({ userId: 1, role: 1, createdAt: -1 });
userSubscriptionSchema.index({ endDate: 1, status: 1 });

module.exports = mongoose.model("UserSubscription", userSubscriptionSchema);
