const crypto = require('crypto');

/**
 * Generates a unique referral code.
 * Format: USR + 6 random alphanumeric characters
 * @returns {string}
 */
const generateReferralCode = () => {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded similar looking characters like 0, O, 1, I
  let code = 'USR';
  for (let i = 0; i < 6; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
};

module.exports = { generateReferralCode };
