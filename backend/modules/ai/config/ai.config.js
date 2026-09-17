const prisma = require('../../../config/prisma');

function parseBool(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

async function checkAiFeatureEnabled(featureKey, defaultVal = false) {
  try {
    if (!parseBool(process.env.AI_FEATURES_ENABLED, false)) return false;

    const featureEnvKeys = {
      aiEnabled: 'AI_FEATURES_ENABLED',
      chatEnabled: 'AI_CHAT_ENABLED',
      profileEnabled: 'AI_PROFILE_ENABLED',
      embeddingsEnabled: 'AI_EMBEDDINGS_ENABLED',
      ocrEnabled: 'AI_OCR_ENABLED',
      fraudEnabled: 'AI_FRAUD_ENABLED',
      fraud_cluster_review: 'AI_FRAUD_ENABLED',
      provider_profile_builder: 'AI_PROFILE_ENABLED',
      role_aware_chat_assistant: 'AI_CHAT_ENABLED',
      provider_pricing_suggestion: 'AI_PROFILE_ENABLED',
      recruiter_job_description: 'AI_PROFILE_ENABLED',
    };
    const featureEnvKey = featureEnvKeys[featureKey];
    if (featureEnvKey && !parseBool(process.env[featureEnvKey], false)) return false;

    const mapping = {
      aiEnabled: 'ai.feature.enabled',
      chatEnabled: 'ai.feature.chat',
      profileEnabled: 'ai.feature.profile',
      embeddingsEnabled: 'ai.feature.embeddings',
      ocrEnabled: 'ai.feature.ocr',
      fraudEnabled: 'ai.feature.fraud',
      // Internal feature names used in logs/services
      fraud_cluster_review: 'ai.feature.fraud',
      provider_profile_builder: 'ai.feature.profile',
      role_aware_chat_assistant: 'ai.feature.chat',
      provider_pricing_suggestion: 'ai.feature.profile',
      recruiter_job_description: 'ai.feature.profile',
    };

    const dbKey = mapping[featureKey] || featureKey;
    const setting = await prisma.adminSetting.findUnique({ where: { key: dbKey } });
    
    if (!setting) {
      // Fallback to env if not in DB
      const envKey = `AI_${featureKey.toUpperCase()}_ENABLED`;
      return parseBool(process.env[envKey], defaultVal);
    }

    return Number(setting.value) === 1;
  } catch (error) {
    return defaultVal;
  }
}

function getAiConfig() {
  const aiEnabled = parseBool(process.env.AI_FEATURES_ENABLED, false);

  return {
    aiEnabled,
    chatEnabled: parseBool(process.env.AI_CHAT_ENABLED, aiEnabled),
    profileEnabled: parseBool(process.env.AI_PROFILE_ENABLED, aiEnabled),
    embeddingsEnabled: parseBool(process.env.AI_EMBEDDINGS_ENABLED, aiEnabled),
    ocrEnabled: parseBool(process.env.AI_OCR_ENABLED, aiEnabled),
    fraudEnabled: parseBool(process.env.AI_FRAUD_ENABLED, aiEnabled),
  };
}

module.exports = {
  parseBool,
  getAiConfig,
  checkAiFeatureEnabled,
};

