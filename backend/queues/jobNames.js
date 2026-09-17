const JOB_QUEUES = {
  AI: 'ai-jobs',
  LEADS: 'lead-jobs',
  OCR: 'ocr-jobs',
  NOTIFICATION: 'notification-jobs',
  ANALYTICS: 'analytics-jobs',
};

const JOB_NAMES = {
  PROVIDER_EMBEDDING_REFRESH: 'provider_embedding_refresh',
  JOB_EMBEDDING_REFRESH: 'job_embedding_refresh',
  PROVIDER_DOCUMENT_VERIFY: 'provider_document_verify',
  AUTO_LEAD_DISTRIBUTION: 'auto_lead_distribution',
  DEMAND_SPIKE_ANALYSIS: 'demand_spike_analysis',
  FRAUD_REVIEW: 'fraud_review',
  TRUST_SCORE_RECALC: 'trust_score_recalc',
};

module.exports = {
  JOB_QUEUES,
  JOB_NAMES,
};
