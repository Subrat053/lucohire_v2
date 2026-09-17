const { normalizeText } = require('./providerParser');

const INTENT_KEYWORDS = {
  pricing_help: ['pricing', 'price', 'rate', 'kitna charge', 'fees', 'budget', 'quotation', 'quote'],
  client_reply_help: ['reply', 'message ka answer', 'polite', 'effective', 'respond', 'client message'],
  profile_help: ['profile', 'headline', 'bio', 'description', 'profile improve', 'about me'],
  job_search_help: ['need a job', 'job chahiye', 'job', 'kaam chahiye', 'work chahiye', 'hiring'],
  lead_help: ['lead', 'recruiter', 'inquiry', 'client lead', 'contact'],
};

function detectProviderIntent({ message, extracted = {} }) {
  const normalized = normalizeText(message || '');

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    if (keywords.some((kw) => normalized.includes(kw))) {
      return intent;
    }
  }

  if (extracted.skill || extracted.city || Number(extracted.experienceMonths || 0) > 0) {
    return 'profile_help';
  }

  return 'general_help';
}

module.exports = {
  detectProviderIntent,
};
