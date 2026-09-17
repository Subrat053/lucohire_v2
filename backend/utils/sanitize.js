/**
 * sanitize.js — Backend sanitization helpers
 *
 * Provides consistent input cleaning for controllers.
 * Only trims/lowercases values; does NOT strip valid characters from passwords
 * or other sensitive fields.
 *
 * Usage:
 *   const { sanitizeString, sanitizeEmail, sanitizePhone } = require('../utils/sanitize');
 */

/**
 * Trim a string value. Returns empty string for non-strings.
 * @param {*} val
 * @returns {string}
 */
const sanitizeString = (val) => {
  if (typeof val !== 'string') return val;
  return val.trim();
};

/**
 * Normalize an email: trim and lowercase.
 * @param {*} val
 * @returns {string}
 */
const sanitizeEmail = (val) => {
  if (typeof val !== 'string') return val;
  return val.trim().toLowerCase();
};

/**
 * Normalize a phone number: strip non-digit/plus characters, trim.
 * Preserves the leading '+' for international format.
 * @param {*} val
 * @returns {string}
 */
const sanitizePhone = (val) => {
  if (typeof val !== 'string') return val;
  const trimmed = val.trim();
  // Strip everything except digits, +, -, (, ), and spaces
  return trimmed.replace(/[^\d+\-() ]/g, '').trim();
};

/**
 * Sanitize an object's fields based on a field-type schema.
 * Unknown fields are passed through unchanged.
 *
 * @param {Object} obj - The request body object
 * @param {Object} schema - Map of field names to sanitizer type: 'string' | 'email' | 'phone'
 * @returns {Object} - New object with sanitized fields
 *
 * Example:
 *   const clean = sanitizeObject(req.body, {
 *     name: 'string',
 *     email: 'email',
 *     phone: 'phone',
 *   });
 */
const sanitizeObject = (obj, schema = {}) => {
  if (!obj || typeof obj !== 'object') return obj;
  const result = { ...obj };

  for (const [field, type] of Object.entries(schema)) {
    if (field in result) {
      switch (type) {
        case 'email':
          result[field] = sanitizeEmail(result[field]);
          break;
        case 'phone':
          result[field] = sanitizePhone(result[field]);
          break;
        case 'string':
        default:
          result[field] = sanitizeString(result[field]);
          break;
      }
    }
  }

  return result;
};

module.exports = { sanitizeString, sanitizeEmail, sanitizePhone, sanitizeObject };
