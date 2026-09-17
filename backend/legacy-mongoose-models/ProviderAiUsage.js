const mongoose = require('mongoose');

const providerAiUsageSchema = new mongoose.Schema({
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProviderSubscription',
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
    chatAssistant: { type: Number, default: 0 },
    aiCareerAnalysis: { type: Number, default: 0 },
    atsScore: { type: Number, default: 0 },
    skillGapReport: { type: Number, default: 0 },
    whyNotHired: { type: Number, default: 0 },
    interviewCallProb: { type: Number, default: 0 },
    resumeImprovement: { type: Number, default: 0 },
    careerGps: { type: Number, default: 0 },
    salaryInsights: { type: Number, default: 0 },
    mockInterview: { type: Number, default: 0 },
    claudeDeepReports: { type: Number, default: 0 },
    refreshInsight: { type: Number, default: 0 },
    careerHealth: { type: Number, default: 0 },
    careerReport: { type: Number, default: 0 },
    careerHealthRefresh: { type: Number, default: 0 },
    careerGpsRefresh: { type: Number, default: 0 },
    whyNotHiredRefresh: { type: Number, default: 0 },
    skillGapRefresh: { type: Number, default: 0 },
    atsOptimizerRefresh: { type: Number, default: 0 },
    interviewQuestionsRefresh: { type: Number, default: 0 },
    resumeScoreRefresh: { type: Number, default: 0 },
    aiTipsRefresh: { type: Number, default: 0 },
    autoAnalysisLimit: { type: Number, default: 0 },
    dailyTasksRefresh: { type: Number, default: 0 },
    careerPlanRefresh: { type: Number, default: 0 },
    resumeOptimization: { type: Number, default: 0 },
    chatMessagesLimit: { type: Number, default: 0 },
  }
}, { timestamps: true });

// Ensure unique index for a provider's subscription usage period
providerAiUsageSchema.index(
  { providerId: 1, subscriptionId: 1, periodStart: 1, periodEnd: 1 },
  { unique: true }
);

module.exports = mongoose.model('ProviderAiUsage', providerAiUsageSchema);
