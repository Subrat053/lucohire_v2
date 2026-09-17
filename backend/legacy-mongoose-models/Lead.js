const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recruiter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  jobPost: { type: mongoose.Schema.Types.ObjectId, ref: 'JobPost' },
  type: { type: String, enum: ['profile_view', 'contact_unlock', 'job_match', 'direct_contact', 'saved_candidate', 'shortlisted_candidate'], required: true },
  notes: [{
    text: String,
    author: String,
    createdAt: { type: Date, default: Date.now }
  }],
  tags: [{ type: String }],
  status: { type: String, enum: ['new', 'viewed', 'contacted', 'hired', 'rejected'], default: 'new' },
  sourceType: { type: String, enum: ['manual', 'rule_engine', 'ai_assisted', 'imported'], default: 'manual', index: true },
  priorityScore: { type: Number, default: 0, min: 0, max: 100 },
  assignedByEngine: { type: Boolean, default: false, index: true },
  confirmationStatus: {
    type: String,
    enum: ['pending', 'provider_confirmed', 'recruiter_confirmed', 'confirmed', 'disputed'],
    default: 'pending',
    index: true,
  },
  message: { type: String, default: '' },
  isUnlocked: { type: Boolean, default: false },
  unlockPaymentId: { type: String, default: '' },
  notifiedViaWhatsapp: { type: Boolean, default: false },
}, { timestamps: true });

leadSchema.index({ provider: 1, status: 1 });
leadSchema.index({ recruiter: 1 });
leadSchema.index({ provider: 1, recruiter: 1, jobPost: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Lead', leadSchema);
