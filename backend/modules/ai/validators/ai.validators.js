const { body, query, param } = require('express-validator');

const profileBuildValidation = [
  body('input').isString().trim().isLength({ min: 5, max: 3000 }).withMessage('input must be 5-3000 chars'),
  body('existingSkills').optional().isArray({ max: 30 }),
  body('existingSkills.*').optional().isString().trim().isLength({ min: 1, max: 80 }),
  body('category').optional().isString().trim().isLength({ max: 120 }),
  body('city').optional().isString().trim().isLength({ max: 120 }),
];

const profileImproveValidation = [
  body('input').isString().trim().isLength({ min: 5, max: 3000 }).withMessage('input must be 5-3000 chars'),
  body('existingSkills').optional().isArray({ max: 30 }),
  body('existingSkills.*').optional().isString().trim().isLength({ min: 1, max: 80 }),
];

const pricingSuggestValidation = [
  body('input').optional().isString().trim().isLength({ max: 3000 }),
  body('category').optional().isString().trim().isLength({ max: 120 }),
  body('city').optional().isString().trim().isLength({ max: 120 }),
  body().custom((value) => {
    if (!value.input && !value.category && !value.city) {
      throw new Error('Provide at least one input/category/city field');
    }
    return true;
  }),
];

const chatConversationCreateValidation = [
  body('title').optional().isString().trim().isLength({ max: 180 }),
  body('metadata').optional().isObject(),
];

const chatHistoryValidation = [
  query('conversationId').isString().trim().isLength({ min: 1 }).withMessage('conversationId is required'),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('before').optional().isString().trim().isLength({ min: 1 }),
];

const chatConversationIdValidation = [
  param('id').isString().trim().isLength({ min: 1 }).withMessage('conversation id is required'),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('before').optional().isString().trim().isLength({ min: 1 }),
];

const chatSendValidation = [
  body('conversationId').optional().isString().trim().isLength({ min: 1 }),
  body('message').isString().trim().isLength({ min: 2, max: 12000 }).withMessage('message must be 2-12000 chars'),
  body('clientMessageId').optional().isString().trim().isLength({ min: 1, max: 120 }),
  body('context').optional().isObject(),
];

const chatRegenerateValidation = [
  body('conversationId').isString().trim().isLength({ min: 1 }).withMessage('conversationId is required'),
  body('messageId').isString().trim().isLength({ min: 1 }).withMessage('messageId is required'),
];

const chatMessageStatusValidation = [
  body('conversationId').isString().trim().isLength({ min: 1 }).withMessage('conversationId is required'),
  body('messageId').isString().trim().isLength({ min: 1 }).withMessage('messageId is required'),
  body('status').isIn(['pending', 'sent', 'failed', 'regenerated']).withMessage('invalid status'),
];

const embeddingsCreateValidation = [
  body('text').isString().trim().isLength({ min: 2, max: 12000 }).withMessage('text must be 2-12000 chars'),
  body('providerId').optional().isString().trim().isLength({ min: 1 }),
  body('metadata').optional().isObject(),
  body('model').optional().isString().trim().isLength({ min: 1, max: 120 }),
];

const vectorSearchValidation = [
  body('text').optional().isString().trim().isLength({ min: 2, max: 12000 }),
  body('vector').optional().isArray({ min: 1 }),
  body('vector.*').optional().isFloat(),
  body('limit').optional().isInt({ min: 1, max: 100 }),
  body('filter').optional().isObject(),
  body().custom((value) => {
    if (!value.text && !Array.isArray(value.vector)) {
      throw new Error('either text or vector is required');
    }
    return true;
  }),
];

module.exports = {
  profileBuildValidation,
  profileImproveValidation,
  pricingSuggestValidation,
  chatConversationCreateValidation,
  chatHistoryValidation,
  chatConversationIdValidation,
  chatSendValidation,
  chatRegenerateValidation,
  chatMessageStatusValidation,
  embeddingsCreateValidation,
  vectorSearchValidation,
};
