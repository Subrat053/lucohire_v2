const mongoose = require('mongoose');

const matchLogSchema = new mongoose.Schema({
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobPost', required: true, index: true },
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  recruiterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  alertType: { type: String, enum: ['email', 'sms'], default: 'email', required: true, index: true },
  sentAt: { type: Date, default: Date.now, required: true },
}, { timestamps: true });

matchLogSchema.index({ jobId: 1, providerId: 1, alertType: 1 }, { unique: true });

module.exports = mongoose.model('MatchLog', matchLogSchema);
