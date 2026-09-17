const mongoose = require("mongoose");

const aiUsageLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },
    role: {
      type: String,
      default: "system",
    },
    feature: {
      type: String,
      required: false,
      index: true,
    },
    featureKey: {
      type: String,
      required: false,
      index: true,
    },
    featureName: {
      type: String,
      required: false,
      index: true,
    },
    provider: {
      type: String,
      required: true,
    },
    model: {
      type: String,
      required: true,
    },
    inputTokens: {
      type: Number,
      default: 0,
    },
    outputTokens: {
      type: Number,
      default: 0,
    },
    totalTokens: {
      type: Number,
      default: 0,
    },
    estimatedCostUsd: {
      type: Number,
      default: 0,
    },
    costEstimate: {
      type: Number,
      default: 0, // USD
    },
    latencyMs: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      default: "success",
    },
    errorMessage: {
      type: String,
      default: "",
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.models.AiUsageLog || mongoose.model("AiUsageLog", aiUsageLogSchema);
