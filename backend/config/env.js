const { AppError } = require('../utils/appError');

function parseBool(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function validateEnv() {
  const missing = [];
  const warnings = [];

  const aiEnabled = parseBool(process.env.AI_FEATURES_ENABLED, true);
  const ocrEnabled = parseBool(process.env.AI_OCR_ENABLED, aiEnabled);
  const embeddingsEnabled = parseBool(process.env.AI_EMBEDDINGS_ENABLED, aiEnabled);
  const queueEnabled = parseBool(process.env.QUEUE_USE_BULLMQ, false);

  if (!process.env.DATABASE_URL) {
    missing.push('DATABASE_URL');
  }

  if (!process.env.JWT_SECRET) {
    missing.push('JWT_SECRET');
  }

  if (embeddingsEnabled) {
    if (!process.env.OPENAI_API_KEY) {
      missing.push('OPENAI_API_KEY');
    }

  }

  if (ocrEnabled && !process.env.GOOGLE_VISION_API_KEY) {
    missing.push('GOOGLE_VISION_API_KEY');
  }

  if (queueEnabled && !process.env.REDIS_URL) {
    missing.push('REDIS_URL');
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    warnings.push('ANTHROPIC_API_KEY is missing; AI text generation will run in fallback mode.');
  }

  if (missing.length > 0) {
    throw new AppError(
      'Missing required environment variables for enabled features',
      500,
      'ENV_VALIDATION_ERROR',
      {
        missing,
        aiEnabled,
        ocrEnabled,
        embeddingsEnabled,
        queueEnabled,
      }
    );
  }

  return {
    ok: true,
    warnings,
    enabled: {
      aiEnabled,
      ocrEnabled,
      embeddingsEnabled,
      queueEnabled,
    },
  };
}

module.exports = {
  parseBool,
  validateEnv,
};
