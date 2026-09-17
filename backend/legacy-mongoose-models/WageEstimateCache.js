const mongoose = require("mongoose");

const wageEstimateCacheSchema = new mongoose.Schema(
  {
    cityName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    pricingType: {
      type: String,
      required: true,
      enum: ["hourly", "daily", "fixed", "monthly", "gig"],
    },
    skill: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    estimate: {
      avgWage: { type: Number, required: true },
      minWage: { type: Number, required: true },
      maxWage: { type: Number, required: true },
      confidence: { type: Number, required: true },
      currency: { type: String, default: "INR" },
      analysis: { type: String, default: "" },
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

// Compound index for caching lookup
wageEstimateCacheSchema.index(
  { cityName: 1, pricingType: 1, skill: 1 },
  { unique: true }
);

// TTL index to automatically expire documents after expiresAt
wageEstimateCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("WageEstimateCache", wageEstimateCacheSchema);
