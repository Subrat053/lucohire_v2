const mongoose = require('mongoose');

/**
 * AI-08: Income Opportunities Dashboard - Weekly Cache
 * Stores AI-generated income path recommendations per candidate per week.
 * Cache is keyed by userId + ISO weekKey + profileVersion.
 * TTL: 7 days (auto-expires via MongoDB TTL index on expiresAt).
 */
const incomePathCacheSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  weekKey: {
    type: String, // e.g. "2025-W26"
    required: true,
  },
  profileVersion: {
    type: Number,
    default: 1,
  },
  cacheKey: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  candidateSummary: {
    type: Object, // Snapshot of input sent to AI (for admin debugging)
    default: {},
  },
  result: {
    type: Object, // Validated AI JSON output
    required: true,
  },
  generatedAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 }, // MongoDB TTL index
  },
}, {
  timestamps: true,
  collection: 'income_path_caches',
});

// Compound index to efficiently find cache by user + week + version
incomePathCacheSchema.index({ userId: 1, weekKey: 1, profileVersion: 1 });

module.exports = mongoose.model('IncomePathCache', incomePathCacheSchema);
