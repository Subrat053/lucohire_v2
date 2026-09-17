const mongoose = require('mongoose');

const pipelineAuditLogSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  actionType: { type: String, required: true },
  entityType: { type: String, enum: ['job', 'company', 'category', 'source', 'freelancer', 'consent', 'scan'], required: true },
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
  beforeState: { type: mongoose.Schema.Types.Mixed, default: null },
  afterState: { type: mongoose.Schema.Types.Mixed, default: null },
  triggerSource: { type: String, enum: ['system_automatic', 'admin_manual'], required: true },
  adminUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reason: { type: String, default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

module.exports = mongoose.model('PipelineAuditLog', pipelineAuditLogSchema);
