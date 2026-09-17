const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  textValidation,
  batchValidation,
  translateText,
  translateBatch,
} = require('../controllers/translationController');

const router = express.Router();

const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

const translateLimiter = rateLimit({
  windowMs: Number(process.env.TRANSLATE_RATE_LIMIT_WINDOW_MS || 60_000),
  max: isDev ? 999999 : Number(process.env.TRANSLATE_RATE_LIMIT_MAX || 300),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many translation requests. Please try again shortly.' },
});

router.post('/text', translateLimiter, textValidation, translateText);
router.post('/batch', translateLimiter, batchValidation, translateBatch);

module.exports = router;