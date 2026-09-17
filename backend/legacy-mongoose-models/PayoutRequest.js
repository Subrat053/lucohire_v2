const mongoose = require("mongoose");

const payoutRequestSchema = new mongoose.Schema(
  {
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    partnerProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PartnerProfile",
      required: true,
    },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "paid"],
      default: "pending",
    },
    paymentMethod: { type: String, default: "" },
    paymentDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    adminRemarks: { type: String, default: "" },
    requestedAt: { type: Date, default: Date.now },
    processedAt: { type: Date, default: null },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
  },
  { timestamps: true }
);

payoutRequestSchema.index({ partnerId: 1, status: 1 });

module.exports = mongoose.model("PayoutRequest", payoutRequestSchema);