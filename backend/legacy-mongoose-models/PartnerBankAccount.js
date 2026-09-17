const mongoose = require("mongoose");

const partnerBankAccountSchema = new mongoose.Schema(
  {
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    accountHolderName: {
      type: String,
      required: true,
      trim: true,
    },
    bankName: {
      type: String,
      required: true,
      trim: true,
    },
    accountNumber: {
      type: String,
      required: true,
      trim: true,
    },
    ifscCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    branchName: {
      type: String,
      trim: true,
    },
    accountType: {
      type: String,
      enum: ["Savings", "Current", "Other"],
      default: "Savings",
    },
    upiId: {
      type: String,
      trim: true,
    },
    isPrimary: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    verifiedAt: Date,
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PartnerBankAccount", partnerBankAccountSchema);
