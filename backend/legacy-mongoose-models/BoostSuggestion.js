const mongoose = require('mongoose');

const boostSuggestionSchema = new mongoose.Schema({
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  skill: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  status: { type: String, enum: ['queued', 'sent', 'failed', 'dismissed'], default: 'queued', index: true },
  scheduledFor: { type: Date, default: Date.now, index: true },
  sentAt: { type: Date, default: null },
  deliveryMeta: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

boostSuggestionSchema.index({ providerId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('BoostSuggestion', boostSuggestionSchema);
