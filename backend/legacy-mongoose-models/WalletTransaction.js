const mongoose = require("mongoose");

const walletTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "signup_cashback",
        "user_referral_commission",
        "partner_referral_commission",
        "platform_commission",
        "provider_task_earning",
        "recruiter_payment",
        "withdrawal_request",
        "withdrawal_approved",
        "withdrawal_rejected",
        "cashback_adjustment",
        "admin_adjustment",
        "payout",
        "manual_adjustment"
      ],
      required: true,
    },
    amount: { type: Number, required: true },
    direction: {
      type: String,
      enum: ["credit", "debit"],
      default: "credit",
    },
    sourceUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    sourceSubscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserSubscription",
      default: null,
    },
    sourcePaymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },
    sourceReferralId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Referral",
      default: null,
    },
    sourceJobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobPost",
      default: null,
    },
    balanceAfter: { type: Number, default: 0 },
    description: { type: String, default: "" },
    status: {
      type: String,
      enum: ["credited", "pending", "failed"],
      default: "credited",
    },
  },
  { timestamps: true }
);

walletTransactionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("WalletTransaction", walletTransactionSchema);
