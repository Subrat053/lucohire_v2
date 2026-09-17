const mongoose = require('mongoose');

const auditEventSchema = new mongoose.Schema({
  eventType: { type: String, required: true, trim: true, index: true },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  actorRole: { type: String, default: 'system', trim: true, index: true },
  entityType: { type: String, required: true, trim: true, index: true },
  entityId: { type: String, required: true, trim: true, index: true },
  payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  piiSafe: { type: Boolean, default: true },
}, { timestamps: true });

auditEventSchema.index({ eventType: 1, createdAt: -1 });

module.exports = mongoose.model('AuditEvent', auditEventSchema);
