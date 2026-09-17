const QUEUE_NAMES = {
  AI: 'ai-jobs',
  OCR: 'ocr-jobs',
  EMBEDDINGS: 'embedding-jobs',
  PROFILE: 'profile-jobs',
  FRAUD: 'fraud-jobs',
  LEADS: 'lead-jobs',
  ANALYTICS: 'analytics-jobs',
};

const QUEUE_JOB_NAMES = {
  AI_CHAT_REPLY: 'ai_chat_reply',
  OCR_EXTRACT_TEXT: 'ocr_extract_text',
  OCR_VERIFY_DOCUMENT: 'ocr_verify_document',
  EMBEDDING_CREATE: 'embedding_create',
  PROFILE_BUILD: 'profile_build',
  FRAUD_ANALYSIS: 'fraud_analysis',
  TRUST_SCORE_RECALC: 'trust_score_recalc',
  DEMAND_SPIKE_ANALYSIS: 'demand_spike_analysis',
  AUTO_LEAD_DISTRIBUTION: 'auto_lead_distribution',
};

module.exports = {
  QUEUE_NAMES,
  QUEUE_JOB_NAMES,
};
