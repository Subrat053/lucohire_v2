const mongoose = require('mongoose');

const fraudFlagSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  reason: { type: String, required: true, trim: true },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium', index: true },
  source: { type: String, default: 'rule_engine', trim: true, index: true },
  status: { type: String, enum: ['open', 'reviewing', 'resolved', 'ignored'], default: 'open', index: true },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

fraudFlagSchema.index({ userId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('FraudFlag', fraudFlagSchema);
