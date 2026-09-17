const mongoose = require('mongoose');

const aiInteractionLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  role: { type: String, enum: ['provider', 'recruiter', 'admin', 'system', 'guest'], default: 'system', index: true },
  feature: { type: String, required: true, trim: true, index: true },
  promptType: { type: String, default: '', trim: true },
  input: { type: mongoose.Schema.Types.Mixed, default: {} },
  output: { type: mongoose.Schema.Types.Mixed, default: {} },
  model: { type: String, default: 'rule-only', trim: true },
  status: { type: String, enum: ['success', 'fallback', 'failed', 'blocked'], default: 'success', index: true },
  createdAt: { type: Date, default: Date.now, index: true },
}, { timestamps: true });

aiInteractionLogSchema.index({ feature: 1, createdAt: -1 });

module.exports = mongoose.model('AIInteractionLog', aiInteractionLogSchema);
