const { body } = require('express-validator');

const providerProfileAISuggestValidation = [
  body('freeText').optional({ checkFalsy: true }).isString().trim().isLength({ max: 1200 }).withMessage('freeText must be max 1200 chars'),
  body('existingSkills').optional().isArray({ max: 20 }),
  body('existingSkills.*').optional().isString().trim().isLength({ max: 60 }),
];

const recruiterAIJobDescriptionValidation = [
  body('prompt').isString().trim().isLength({ min: 3, max: 1000 }).withMessage('prompt must be 3-1000 chars'),
  body('skill').optional().isString().trim().isLength({ max: 80 }),
  body('city').optional().isString().trim().isLength({ max: 80 }),
  body('budgetMin').optional().isInt({ min: 0 }),
  body('budgetMax').optional().isInt({ min: 0 }),
  body('budgetType').optional().isIn(['fixed', 'hourly', 'monthly', 'negotiable']),
];

module.exports = {
  providerProfileAISuggestValidation,
  recruiterAIJobDescriptionValidation,
};
