const { body, validationResult } = require('express-validator');
const asyncHandler = require('../utils/asyncHandler');
const {
  normalizeTargetLanguage,
  translateSingleText,
  translateBatchTexts,
} = require('../services/translateService');

const validateTranslationPayload = (req, res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  return res.status(400).json({
    success: false,
    message: 'Validation failed',
    errors: result.array().map((item) => ({
      field: item.path,
      message: item.msg,
      value: item.value,
    })),
  });
};

const textValidation = [
  body('text').isString().withMessage('text must be a string').trim().isLength({ min: 1, max: 5000 }).withMessage('text must be between 1 and 5000 characters'),
  body('targetLanguage').isString().withMessage('targetLanguage is required').trim().notEmpty(),
  validateTranslationPayload,
];

const batchValidation = [
  body('texts').isArray({ min: 1, max: 100 }).withMessage('texts must be an array with 1 to 100 items'),
  body('texts.*').isString().withMessage('each text must be a string').trim().isLength({ min: 1, max: 5000 }).withMessage('each text must be between 1 and 5000 characters'),
  body('targetLanguage').isString().withMessage('targetLanguage is required').trim().notEmpty(),
  validateTranslationPayload,
];

const translateText = asyncHandler(async (req, res) => {
  const targetLanguage = normalizeTargetLanguage(req.body.targetLanguage);
  if (targetLanguage === 'en') {
    return res.json({ success: true, data: { translatedText: String(req.body.text || ''), targetLanguage } });
  }

  const translatedText = await translateSingleText(req.body.text, targetLanguage);
  return res.json({ success: true, data: { translatedText, targetLanguage } });
});

const translateBatch = asyncHandler(async (req, res) => {
  const targetLanguage = normalizeTargetLanguage(req.body.targetLanguage);
  const texts = Array.isArray(req.body.texts) ? req.body.texts : [];

  if (targetLanguage === 'en') {
    return res.json({ success: true, data: { translatedTexts: texts.map((item) => String(item || '')), targetLanguage } });
  }

  const translatedTexts = await translateBatchTexts(texts, targetLanguage);
  return res.json({ success: true, data: { translatedTexts, targetLanguage } });
});

module.exports = {
  textValidation,
  batchValidation,
  translateText,
  translateBatch,
};