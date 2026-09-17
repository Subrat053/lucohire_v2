const mongoose = require('mongoose');

const automationTaskLogSchema = new mongoose.Schema({
  taskType: { type: String, required: true, trim: true, index: true },
  relatedEntityType: { type: String, default: '', trim: true, index: true },
  relatedEntityId: { type: String, default: '', trim: true, index: true },
  status: { type: String, enum: ['queued', 'running', 'success', 'failed', 'skipped'], default: 'queued', index: true },
  attemptCount: { type: Number, default: 0, min: 0 },
  payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  result: { type: mongoose.Schema.Types.Mixed, default: {} },
  error: { type: String, default: '' },
  executedAt: { type: Date, default: null, index: true },
  idempotencyKey: { type: String, default: '', trim: true, index: true },
}, { timestamps: true });

automationTaskLogSchema.index({ taskType: 1, relatedEntityType: 1, relatedEntityId: 1, createdAt: -1 });

module.exports = mongoose.model('AutomationTaskLog', automationTaskLogSchema);
