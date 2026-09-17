const mongoose = require('mongoose');

const candidateJobMatchSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  jobId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  jobCollection: { type: String, enum: ['JobPost', 'ExternalJob'], required: true }, // Internal vs. External Job
  
  matchScore: { type: Number, default: 0, min: 0, max: 100, index: true },
  skillScore: { type: Number, default: 0 },
  locationScore: { type: Number, default: 0 },
  experienceScore: { type: Number, default: 0 },
  salaryScore: { type: Number, default: 0 },
  jobTypeScore: { type: Number, default: 0 },
  
  reason: { type: String, default: '' },
  isNotified: { type: Boolean, default: false },
  
  viewedAt: { type: Date, default: null },
  savedAt: { type: Date, default: null },
  appliedAt: { type: Date, default: null }
}, { timestamps: true });

candidateJobMatchSchema.index({ userId: 1, jobId: 1 }, { unique: true });

module.exports = mongoose.model('CandidateJobMatch', candidateJobMatchSchema);
