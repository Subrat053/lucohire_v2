const mongoose = require('mongoose');

const freelancerContactConsentRequestSchema = new mongoose.Schema({
  freelancerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  requestMessage: { type: String, default: null },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'expired'], default: 'pending' },
  channel: { type: String, default: 'whatsapp' },
  requestedAt: { type: Date, default: Date.now },
  respondedAt: { type: Date, default: null },
  auditLogId: { type: mongoose.Schema.Types.ObjectId, ref: 'PipelineAuditLog', default: null }
}, { timestamps: true });

module.exports = mongoose.model('FreelancerContactConsentRequest', freelancerContactConsentRequestSchema);
