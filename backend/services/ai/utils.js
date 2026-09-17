const JSON_FENCE_REGEX = /```(?:json)?\s*([\s\S]*?)```/i;

function normalizeText(value) {
  return String(value || '').trim();
}

function sanitizePromptInput(value, maxLength = 4000) {
  return normalizeText(value)
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .slice(0, maxLength);
}

function safeJsonParse(payload) {
  if (payload === null || payload === undefined) return null;
  if (typeof payload === 'object') return payload;

  const raw = String(payload).trim();
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (_) {
    const fenced = raw.match(JSON_FENCE_REGEX);
    if (fenced && fenced[1]) {
      try {
        return JSON.parse(fenced[1].trim());
      } catch (__) {
        return null;
      }
    }

    const firstBrace = raw.indexOf('{');
    const lastBrace = raw.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      try {
        return JSON.parse(raw.slice(firstBrace, lastBrace + 1));
      } catch (__) {
        return null;
      }
    }

    return null;
  }
}

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function estimateTokens(text) {
  const chars = String(text || '').length;
  return Math.ceil(chars / 4);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  normalizeText,
  sanitizePromptInput,
  safeJsonParse,
  isPlainObject,
  estimateTokens,
  sleep,
};
