const mongoose = require('mongoose');

const recruiterAiUsageSchema = new mongoose.Schema({
  recruiterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserSubscription',
    required: true
  },
  periodStart: {
    type: Date,
    required: true
  },
  periodEnd: {
    type: Date,
    required: true
  },
  usage: {
    aiJdGenerator: { type: Number, default: 0 },
    aiJdParsing: { type: Number, default: 0 },
    aiCopilot: { type: Number, default: 0 },
    interviewKits: { type: Number, default: 0 },
    outreachCampaigns: { type: Number, default: 0 },
    directMessaging: { type: Number, default: 0 },
    customReports: { type: Number, default: 0 },
  }
}, { timestamps: true });

// Ensure unique index for a recruiter's subscription usage period
recruiterAiUsageSchema.index(
  { recruiterId: 1, subscriptionId: 1, periodStart: 1, periodEnd: 1 },
  { unique: true }
);

module.exports = mongoose.model('RecruiterAiUsage', recruiterAiUsageSchema);
