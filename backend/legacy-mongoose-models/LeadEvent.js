const mongoose = require('mongoose');

const leadEventSchema = new mongoose.Schema({
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
  eventType: { type: String, required: true, trim: true, index: true },
  payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  actorType: { type: String, enum: ['system', 'provider', 'recruiter', 'admin'], default: 'system' },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  timestamp: { type: Date, default: Date.now, index: true },
}, { timestamps: true });

leadEventSchema.index({ leadId: 1, eventType: 1, timestamp: -1 });

module.exports = mongoose.model('LeadEvent', leadEventSchema);
