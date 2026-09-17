const mongoose = require("mongoose");
const { approvalSectionSchema, activityLogSchema } = require('./ProfileSectionReview');

const partnerProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    referralCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    referralLink: { type: String, default: "" },
    commissionRate: { type: Number, default: 40 },

    totalRevenueCollected: { type: Number, default: 0 },
    totalCommissionEarned: { type: Number, default: 0 },
    availableCommission: { type: Number, default: 0 },
    withdrawnCommission: { type: Number, default: 0 },
    pendingPayout: { type: Number, default: 0 },

    tier: {
      type: String,
      enum: ["Bronze", "Silver", "Gold", "Platinum"],
      default: "Gold",
    },
    level: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      refPath: "createdByModel",
    },
    createdByModel: {
      type: String,
      enum: ["User", "Admin"],
      default: "Admin",
    },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    approvalSections: {
      type: [approvalSectionSchema],
      default: [],
    },
    activityLogs: {
      type: [activityLogSchema],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PartnerProfile", partnerProfileSchema);