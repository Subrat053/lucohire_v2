const { body, query } = require('express-validator');

const interpretSearchValidation = [
  body('query').isString().trim().isLength({ min: 2, max: 300 }).withMessage('query must be 2-300 chars'),
];

const searchProvidersValidation = [
  query('query').optional().isString().trim().isLength({ max: 300 }).withMessage('query too long'),
  query('skill').optional().isString().trim().isLength({ max: 80 }),
  query('city').optional().isString().trim().isLength({ max: 80 }),
  query('location').optional().isString().trim().isLength({ max: 120 }),
  query('locality').optional().isString().trim().isLength({ max: 120 }),
  query('lat').optional().isFloat({ min: -90, max: 90 }).withMessage('lat must be valid latitude'),
  query('lng').optional().isFloat({ min: -180, max: 180 }).withMessage('lng must be valid longitude'),
  query('radius').optional().isFloat({ min: 1, max: 300 }).withMessage('radius must be between 1-300'),
  query('availability').optional().isIn(['true', 'false']).withMessage('availability must be true or false'),
  query('sortBy').optional().isIn(['match', 'distance', 'rating', 'trust', 'response']),
  query('page').optional().isInt({ min: 1, max: 1000 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  // Skill-level / tier filter
  query('tier').optional().isIn(['', 'unskilled', 'semi-skilled', 'skilled']).withMessage('tier must be unskilled, semi-skilled, or skilled'),
  // Minimum rating filter (1–5)
  query('rating').optional().isFloat({ min: 1, max: 5 }).withMessage('rating must be between 1 and 5'),
  // Minimum years of experience
  query('experience').optional().isInt({ min: 0, max: 50 }).withMessage('experience must be 0–50 years'),
  // Verified-only filter
  query('verified').optional().isIn(['true', 'false', '']).withMessage('verified must be true or false'),
];

const autoMatchValidation = [
  body('query').optional().isString().trim().isLength({ max: 300 }),
  body('skill').optional().isString().trim().isLength({ max: 80 }),
  body('city').optional().isString().trim().isLength({ max: 80 }),
  body('location').optional().isString().trim().isLength({ max: 120 }),
  body('locality').optional().isString().trim().isLength({ max: 120 }),
  body('lat').optional().isFloat({ min: -90, max: 90 }),
  body('lng').optional().isFloat({ min: -180, max: 180 }),
  body('radius').optional().isFloat({ min: 1, max: 300 }),
  body('instantHire').optional().isBoolean(),
  body().custom((value) => {
    if (!value.query && !value.skill && !value.city && !value.location && !value.locality) {
      throw new Error('Provide query or at least one structured filter');
    }
    return true;
  }),
];

module.exports = {
  interpretSearchValidation,
  searchProvidersValidation,
  autoMatchValidation,
};
