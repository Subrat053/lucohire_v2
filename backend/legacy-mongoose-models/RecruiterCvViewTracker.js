const mongoose = require('mongoose');

const recruiterCvViewTrackerSchema = new mongoose.Schema(
  {
    recruiterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProviderProfile',
      required: true,
    },
    viewedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Ensure a recruiter cannot double-count viewing the same candidate's CV
recruiterCvViewTrackerSchema.index({ recruiterId: 1, candidateId: 1 }, { unique: true });

const RecruiterCvViewTracker = mongoose.model('RecruiterCvViewTracker', recruiterCvViewTrackerSchema);

module.exports = RecruiterCvViewTracker;
