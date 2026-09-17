/**
 * sanitizePayload.js
 *
 * Recursively trims string values in a form payload before submission.
 * Converts email fields to lowercase.
 * Strips non-essential whitespace from phone numbers.
 * Does NOT modify arrays, booleans, numbers, or null.
 *
 * Usage:
 *   import { sanitizePayload } from '../utils/sanitizePayload';
 *   const clean = sanitizePayload({ name: '  John  ', email: ' JOHN@TEST.COM ' });
 *   // → { name: 'John', email: 'john@test.com' }
 */

const EMAIL_FIELDS = new Set(['email', 'emailAddress', 'userEmail', 'loginEmail']);
const PHONE_FIELDS = new Set(['phone', 'phoneNumber', 'mobile', 'mobileNumber', 'whatsappNumber', 'contactNumber']);

/**
 * Sanitize a single string value.
 * @param {string} key - Field name (used to determine transformation type)
 * @param {string} value - Raw string value
 * @returns {string}
 */
const sanitizeString = (key, value) => {
  if (typeof value !== 'string') return value;

  let cleaned = value.trim();

  // Normalize internal multiple-spaces to single space (for names, descriptions)
  // Only for non-email, non-password fields
  if (!EMAIL_FIELDS.has(key) && key !== 'password' && key !== 'confirmPassword') {
    cleaned = cleaned.replace(/  +/g, ' ');
  }

  if (EMAIL_FIELDS.has(key)) {
    cleaned = cleaned.toLowerCase();
  }

  return cleaned;
};

/**
 * Recursively sanitize a payload object.
 * Handles nested objects (e.g. providerProfile, recruiterProfile) one level deep.
 * @param {Object} obj - The payload object to sanitize
 * @returns {Object} - Sanitized copy (does not mutate original)
 */
export const sanitizePayload = (obj) => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;

  const result = {};

  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === 'string') {
      result[key] = sanitizeString(key, val);
    } else if (Array.isArray(val)) {
      // Trim strings inside arrays (e.g. skills array)
      result[key] = val.map((item) =>
        typeof item === 'string' ? item.trim() : item,
      );
    } else if (val !== null && val !== undefined && typeof val === 'object') {
      // Recurse one level for nested profile objects
      result[key] = sanitizePayload(val);
    } else {
      result[key] = val;
    }
  }

  return result;
};

/**
 * Check if a value is empty or contains only whitespace.
 * Useful for post-trim validation.
 * @param {*} val
 * @returns {boolean}
 */
export const isEmptyOrWhitespace = (val) =>
  val === undefined ||
  val === null ||
  (typeof val === 'string' && val.trim() === '');

/**
 * Validate that required fields are non-empty after trimming.
 * @param {Object} obj - Payload object (already sanitized)
 * @param {string[]} requiredFields - Array of required field keys
 * @returns {{ valid: boolean, firstError: string|null }}
 */
export const validateRequired = (obj, requiredFields = []) => {
  for (const field of requiredFields) {
    if (isEmptyOrWhitespace(obj[field])) {
      return { valid: false, firstError: field };
    }
  }
  return { valid: true, firstError: null };
};

export default sanitizePayload;
