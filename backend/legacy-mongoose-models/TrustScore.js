const mongoose = require('mongoose');

const trustScoreSchema = new mongoose.Schema({
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  score: { type: Number, required: true, min: 0, max: 100, index: true },
  breakdown: {
    ratingWeight: { type: Number, default: 0 },
    responseWeight: { type: Number, default: 0 },
    completenessWeight: { type: Number, default: 0 },
    rejectionWeight: { type: Number, default: 0 },
    verificationWeight: { type: Number, default: 0 },
    fraudPenaltyWeight: { type: Number, default: 0 },
  },
  reasons: [{ type: String, trim: true }],
  configVersion: { type: Number, default: 1 },
  computedAt: { type: Date, default: Date.now, index: true },
}, { timestamps: true });

module.exports = mongoose.model('TrustScore', trustScoreSchema);
