const mongoose = require('mongoose');

const candidateActivityLogSchema = new mongoose.Schema({
  candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'StagingCandidate', required: true },
  eventType: { type: String, enum: ['imported', 'duplicate_skipped', 'claim_link_sent', 'claim_link_clicked', 'profile_claimed', 'email_verified', 'phone_verified', 'opted_out', 'deleted', 'job_applied', 'resume_uploaded'], required: true },
  source: { type: String, default: 'System' },
  metadataJson: { type: Object, default: {} }
}, { timestamps: true });

module.exports = mongoose.model('CandidateActivityLog', candidateActivityLogSchema);
