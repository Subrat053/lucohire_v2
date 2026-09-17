const mongoose = require("mongoose");

const partnerRewardSchema = new mongoose.Schema(
  {
    partner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    referral: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Referral",
      default: null,
    },
    referredUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    sourceType: {
      type: String,
      enum: ["registration", "job_posted", "job_completed", "plan_purchase"],
      required: true,
    },
    amount: { type: Number, required: true, default: 0 },
    status: {
      type: String,
      enum: ["pending", "approved", "paid", "rejected"],
      default: "pending",
    },
    paidAt: { type: Date, default: null },
    month: { type: Number },
    year: { type: Number },
    remarks: { type: String, default: "" },
  },
  { timestamps: true }
);

partnerRewardSchema.index({ partner: 1, status: 1 });
partnerRewardSchema.index({ referral: 1 });
partnerRewardSchema.index({ month: 1, year: 1 });

module.exports = mongoose.model("PartnerReward", partnerRewardSchema);
