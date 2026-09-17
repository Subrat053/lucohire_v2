const { Translate } = require('@google-cloud/translate').v2;
const { AppError } = require('../utils/appError');
const prisma = require('../config/prisma');

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

function getClient() {
  const apiKey = String(process.env.GOOGLE_TRANSLATE_API_KEY || '').trim();
  const projectId = String(process.env.GOOGLE_PROJECT_ID || '').trim();

  if (!apiKey) {
    throw new AppError('Missing GOOGLE_TRANSLATE_API_KEY in environment variables', 500, 'TRANSLATE_ENV_MISSING');
  }

  // Initialize client with explicit key and project
  return new Translate({ key: apiKey, projectId });
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
  if (/^[A-Za-z0-9_-]{8,}$/.test(value) && !/\s/.test(value)) return true;
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

async function translateWithClient(texts, targetLanguage) {
  if (!texts.length) return [];
  const client = getClient();
  // Google client accepts array of strings
  const [results] = await client.translate(texts, targetLanguage);
  // results may be string or array
  if (typeof results === 'string') return [results];
  return Array.isArray(results) ? results.map(String) : texts;
}

async function translateBatchTexts(texts, targetLanguage) {
  const normalizedLanguage = normalizeTargetLanguage(targetLanguage);
  const sourceTexts = Array.isArray(texts) ? texts.map((item) => String(item ?? '')) : [];

  if (normalizedLanguage === 'en') return sourceTexts;

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

  if (missingTexts.length === 0) return output;

  const protectedInputs = missingPayload.map((p) => p.protectedText);
  const translatedTexts = await translateWithClient(protectedInputs, normalizedLanguage);

  const cacheWrites = [];
  missingTexts.forEach((text, idx) => {
    const restoredText = restorePlaceholders(translatedTexts[idx] || text, missingPayload[idx]?.placeholders || []);
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

module.exports = {
  normalizeTargetLanguage,
  shouldSkipTranslation,
  shieldPlaceholders,
  restorePlaceholders,
  translateSingleText,
  translateBatchTexts,
};
