const axios = require('axios');
const { AppError } = require('../utils/appError');
const prisma = require('../config/prisma');

const TRANSLATE_ENDPOINT = 'https://translation.googleapis.com/language/translate/v2';
const SUPPORTED_LANGUAGES = new Set([
  'ab', 'ace', 'ach', 'af', 'sq', 'alz', 'am', 'ar', 'hy', 'as',
  'awa', 'ay', 'az', 'ban', 'bm', 'ba', 'eu', 'btx', 'bts', 'bbc',
  'be', 'bem', 'bn', 'bew', 'bho', 'bik', 'bs', 'br', 'bg', 'bua',
  'yue', 'ca', 'ceb', 'ny', 'zh', 'zh-TW', 'cv', 'co', 'crh', 'hr',
  'cs', 'da', 'dv', 'din', 'doi', 'dov', 'nl', 'dz', 'en', 'eo',
  'et', 'ee', 'fj', 'tl', 'fi', 'fr', 'fr-CA', 'fy', 'ff', 'gaa',
  'gl', 'ka', 'de', 'el', 'gn', 'gu', 'ht', 'cnh', 'ha', 'haw',
  'iw', 'hil', 'hi', 'hmn', 'hu', 'hrx', 'is', 'ig', 'ilo', 'id',
  'ga', 'it', 'ja', 'jw', 'kn', 'pam', 'kk', 'km', 'cgg', 'rw',
  'ktu', 'gom', 'ko', 'kri', 'ku', 'ckb', 'ky', 'lo', 'ltg', 'la',
  'lv', 'lij', 'li', 'ln', 'lt', 'lmo', 'lg', 'luo', 'lb', 'mk',
  'mai', 'mak', 'mg', 'ms', 'ms-Arab', 'ml', 'mt', 'mi', 'mr', 'chm',
  'mni-Mtei', 'min', 'lus', 'mn', 'my', 'nr', 'new', 'ne', 'no', 'nus',
  'oc', 'or', 'om', 'pag', 'pap', 'ps', 'fa', 'pl', 'pt', 'pt-PT',
  'pa', 'pa-Arab', 'qu', 'rom', 'ro', 'rn', 'ru', 'sm', 'sg', 'sa',
  'gd', 'nso', 'sr', 'st', 'crs', 'shn', 'sn', 'scn', 'szl', 'sd',
  'si', 'sk', 'sl', 'so', 'es', 'su', 'sw', 'ss', 'sv', 'tg',
  'ta', 'tt', 'te', 'tet', 'th', 'ti', 'ts', 'tn', 'tr', 'tk',
  'ak', 'uk', 'ur', 'ug', 'uz', 'vi', 'cy', 'xh', 'yi', 'yo',
  'yua', 'zu', 'he', 'jv', 'zh-CN'
]);
const PLACEHOLDER_PATTERN = /{{\s*[^}]+\s*}}/g;
const TRANSLATABLE_ONLY_PATTERN = /[\p{L}]/u;

function normalizeTargetLanguage(value) {
  const language = String(value || '').trim().toLowerCase().split(/[-_]/)[0];
  return SUPPORTED_LANGUAGES.has(language) ? language : 'en';
}

function getApiConfig() {
  const apiKey = String(process.env.GOOGLE_TRANSLATE_API_KEY || '').trim();
  const projectId = String(process.env.GOOGLE_PROJECT_ID || '').trim();

  if (!apiKey) {
    throw new AppError('Missing GOOGLE_TRANSLATE_API_KEY in environment variables', 500, 'TRANSLATE_ENV_MISSING');
  }

  return { apiKey, projectId };
}

function shieldPlaceholders(text) {
  const placeholders = [];
  const protectedText = String(text || '').replace(PLACEHOLDER_PATTERN, (match) => {
    const token = `__SHIELD_${placeholders.length}__`;
    placeholders.push({ token, value: match });
    return token;
  });

  return { protectedText, placeholders };
}

function restorePlaceholders(text, placeholders) {
  return placeholders.reduce((acc, item) => acc.replaceAll(item.token, item.value), text);
}

function shouldSkipTranslation(text) {
  const value = String(text || '').trim();
  if (!value) return true;
  if (value.length <= 1) return true;
  if (!TRANSLATABLE_ONLY_PATTERN.test(value)) return true;
  if (/^https?:\/\//i.test(value) || /^www\./i.test(value)) return true;
  if (/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(value)) return true;
  if (/^[\d\s()+\-.,/:%₹$€£¥]+$/.test(value)) return true;
  if (/^#[0-9a-f]{3,8}$/i.test(value)) return true;
  if (/^[A-Za-z0-9_-]{8,}$/.test(value) && !/[\s]/.test(value)) return true;
  return false;
}

async function readCachedTranslations(texts, targetLanguage) {
  const uniqueTexts = [...new Set(texts.filter(Boolean).map((item) => String(item)))];
  if (uniqueTexts.length === 0) return new Map();

  const cached = await prisma.translationCache.findMany({
    where: { targetLanguage, originalText: { in: uniqueTexts } },
  });

  return new Map(cached.map((item) => [item.originalText, item.translatedText]));
}

async function writeCachedTranslations(records, targetLanguage) {
  if (!records.length) return;

  await prisma.$transaction(records.map((item) => prisma.translationCache.upsert({
    where: {
      originalText_targetLanguage: {
        originalText: item.originalText,
        targetLanguage,
      },
    },
    create: {
      originalText: item.originalText,
      translatedText: item.translatedText,
      targetLanguage,
    },
    update: { translatedText: item.translatedText },
  })));
}

async function translateFromGoogle(texts, targetLanguage) {
  if (!texts.length) return [];

  const { apiKey } = getApiConfig();
  const response = await axios.post(
    `${TRANSLATE_ENDPOINT}?key=${encodeURIComponent(apiKey)}`,
    {
      q: texts,
      target: targetLanguage,
      format: 'text',
      source: 'en',
      model: 'nmt',
    },
    {
      timeout: 20000,
      headers: { 'Content-Type': 'application/json' },
    }
  );

  const translations = response?.data?.data?.translations;
  if (!Array.isArray(translations) || translations.length !== texts.length) {
    throw new AppError('Google Translate returned an unexpected response', 502, 'TRANSLATE_INVALID_RESPONSE');
  }

  return translations.map((item, index) => {
    const translatedText = String(item?.translatedText || '')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&');
    return translatedText || texts[index];
  });
}

async function translateBatchTexts(texts, targetLanguage) {
  const normalizedLanguage = normalizeTargetLanguage(targetLanguage);
  const sourceTexts = Array.isArray(texts) ? texts.map((item) => String(item ?? '')) : [];

  if (normalizedLanguage === 'en') {
    return sourceTexts;
  }

  const output = [...sourceTexts];
  const cache = await readCachedTranslations(sourceTexts, normalizedLanguage);

  const missingTexts = [];
  const missingIndexByText = new Map();
  const missingPayload = [];

  sourceTexts.forEach((text, index) => {
    if (!text || shouldSkipTranslation(text)) {
      output[index] = text;
      return;
    }

    const cachedValue = cache.get(text);
    if (cachedValue) {
      output[index] = cachedValue;
      return;
    }

    if (!missingIndexByText.has(text)) {
      missingIndexByText.set(text, []);
      missingTexts.push(text);
      missingPayload.push(shieldPlaceholders(text));
    }
    missingIndexByText.get(text).push(index);
  });

  if (missingTexts.length === 0) {
    return output;
  }

  const translatedTexts = await translateFromGoogle(
    missingPayload.map((item) => item.protectedText),
    normalizedLanguage
  );
  const cacheWrites = [];

  missingTexts.forEach((text, index) => {
    const restoredText = restorePlaceholders(translatedTexts[index] || text, missingPayload[index]?.placeholders || []);
    const translatedText = restoredText || text;
    cacheWrites.push({ originalText: text, translatedText });

    const indexes = missingIndexByText.get(text) || [];
    indexes.forEach((itemIndex) => {
      output[itemIndex] = translatedText;
    });
  });

  await writeCachedTranslations(cacheWrites, normalizedLanguage);
  return output;
}

async function translateSingleText(text, targetLanguage) {
  const [translated] = await translateBatchTexts([text], targetLanguage);
  return translated;
}

function protectTextBeforeTranslation(text) {
  return shieldPlaceholders(text);
}

function restoreTextAfterTranslation(text, placeholders) {
  return restorePlaceholders(text, placeholders);
}

module.exports = {
  normalizeTargetLanguage,
  shouldSkipTranslation,
  protectTextBeforeTranslation,
  restoreTextAfterTranslation,
  translateSingleText,
  translateBatchTexts,
};
