const mongoose = require('mongoose');

const recruiterLeadTrackerSchema = new mongoose.Schema(
  {
    recruiterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProviderProfile', // or User
      required: true,
    },
    viewedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Ensure a recruiter cannot double-count the same candidate
recruiterLeadTrackerSchema.index({ recruiterId: 1, candidateId: 1 }, { unique: true });

const RecruiterLeadTracker = mongoose.model('RecruiterLeadTracker', recruiterLeadTrackerSchema);

module.exports = RecruiterLeadTracker;
