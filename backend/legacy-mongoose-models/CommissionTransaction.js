const mongoose = require("mongoose");

const commissionTransactionSchema = new mongoose.Schema(
  {
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    referralId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Referral",
      required: true,
    },
    referredUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserSubscription",
      default: null,
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },
    planAmount: { type: Number, required: true },
    commissionRate: { type: Number, required: true },
    commissionAmount: { type: Number, required: true },
    type: {
      type: String,
      enum: ["first_subscription_commission"],
      default: "first_subscription_commission",
    },
    status: {
      type: String,
      enum: ["earned", "paid", "cancelled"],
      default: "earned",
    },
    remarks: { type: String, default: "" },
  },
  { timestamps: true }
);

commissionTransactionSchema.index(
  { referralId: 1, type: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "CommissionTransaction",
  commissionTransactionSchema
);