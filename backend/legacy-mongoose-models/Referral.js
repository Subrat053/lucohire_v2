const mongoose = require("mongoose");

const referralSchema = new mongoose.Schema(
  {
    referrerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    referrerType: {
      type: String,
      enum: ["user", "partner", "admin"],
      required: true,
    },
    partnerProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PartnerProfile",
      default: null,
    },
    referredUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    referredRole: {
      type: String,
      enum: ["provider", "recruiter"],
      required: true,
    },
    referralCode: { type: String, default: "" },
    registrationSource: {
      type: String,
      enum: ["partner_dashboard", "referral_link", "user_link"],
      default: "referral_link",
    },
    status: {
      type: String,
      enum: ["registered", "subscribed", "cancelled", "active", "inactive"],
      default: "registered",
    },

    selectedPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      default: null,
    },
    firstSubscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserSubscription",
      default: null,
    },
    firstPaymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },
    firstPlanAmount: { type: Number, default: 0 },
    commissionRate: { type: Number, default: 40 },
    commissionAmount: { type: Number, default: 0 },
    commissionStatus: {
      type: String,
      enum: ["pending", "paid", "blocked", "earned", "cancelled"],
      default: "pending",
    },
    subscriptionAmount: { type: Number, default: 0 },
    commissionPercentage: { type: Number, default: 0 },
    paidAt: { type: Date, default: null },
    jobsCreated: { type: Number, default: 0 },
    jobsCompleted: { type: Number, default: 0 },
    rewardEligible: { type: Boolean, default: false },
    rewardAmount: { type: Number, default: 0 },
    rewardStatus: {
      type: String,
      enum: ["pending", "paid", "hold"],
      default: "pending",
    },
    activatedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

referralSchema.index({ referredUserId: 1, referrerId: 1 }, { unique: true });
referralSchema.index({ referrerId: 1, status: 1 });

module.exports = mongoose.model("Referral", referralSchema);