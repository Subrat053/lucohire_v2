/**
 * phoneValidation.js - Backend phone validation and parsing helpers
 */

const COUNTRY_RULES = [
  { code: "IN", dialCode: "+91", regex: /^[6-9]\d{9}$/ },
  { code: "US", dialCode: "+1", regex: /^[2-9]\d{9}$/ },
  { code: "CA", dialCode: "+1", regex: /^[2-9]\d{9}$/ },
  { code: "GB", dialCode: "+44", regex: /^[1-9]\d{8,9}$/ },
  { code: "AU", dialCode: "+61", regex: /^4\d{8}$/ },
  { code: "DE", dialCode: "+49", regex: /^1[5-7]\d{8,9}$/ },
  { code: "FR", dialCode: "+33", regex: /^[67]\d{8}$/ },
  { code: "AE", dialCode: "+971", regex: /^5[024568]\d{7}$/ },
  { code: "SA", dialCode: "+966", regex: /^5\d{8}$/ },
  { code: "SG", dialCode: "+65", regex: /^[89]\d{7}$/ },
  { code: "MY", dialCode: "+60", regex: /^1\d{8,9}$/ },
  { code: "BD", dialCode: "+880", regex: /^1[3-9]\d{8}$/ },
  { code: "PK", dialCode: "+92", regex: /^3\d{9}$/ },
  { code: "NP", dialCode: "+977", regex: /^9[78]\d{8}$/ },
  { code: "LK", dialCode: "+94", regex: /^7[0-9]\d{7}$/ }
];

/**
 * Validate national number based on country code (dialCode or country code IN/US)
 * @param {string} countryCode E.g., "+91", "IN"
 * @param {string} nationalNumber E.g., "9876543210"
 * @returns {boolean}
 */
function isValidPhoneNumber(countryCode, nationalNumber) {
  if (!countryCode || !nationalNumber) return false;

  // Normalize countryCode (ensure starts with + if it's a dial code)
  let normalizedCc = countryCode.trim();
  if (/^\d+$/.test(normalizedCc)) {
    normalizedCc = "+" + normalizedCc;
  }

  const cleanNational = nationalNumber.replace(/\D/g, "");
  
  const rule = COUNTRY_RULES.find(
    (c) => c.dialCode === normalizedCc || c.code.toUpperCase() === normalizedCc.toUpperCase()
  );

  if (rule) {
    return rule.regex.test(cleanNational);
  }

  // Fallback E.164: 7 to 15 digits
  return cleanNational.length >= 7 && cleanNational.length <= 15;
}

/**
 * Parse full phone number string (with or without +) into countryCode and nationalNumber
 * @param {string} fullPhoneStr E.g., "+919876543210"
 * @returns {{countryCode: string, nationalNumber: string, fullPhone: string}}
 */
function parsePhoneString(fullPhoneStr) {
  if (!fullPhoneStr) {
    return { countryCode: "", nationalNumber: "", fullPhone: "" };
  }

  let clean = fullPhoneStr.trim();
  if (!clean.startsWith("+")) {
    const digitsOnly = clean.replace(/\D/g, "");
    if (digitsOnly.length === 10) {
      return {
        countryCode: "+91",
        nationalNumber: digitsOnly,
        fullPhone: "+91" + digitsOnly,
      };
    }
    // Starts with a common country code format without plus (e.g. 919876543210)
    const sortedRules = [...COUNTRY_RULES].sort((a, b) => b.dialCode.length - a.dialCode.length);
    for (const r of sortedRules) {
      const dialNoPlus = r.dialCode.replace("+", "");
      if (digitsOnly.startsWith(dialNoPlus)) {
        const national = digitsOnly.slice(dialNoPlus.length);
        return {
          countryCode: r.dialCode,
          nationalNumber: national,
          fullPhone: r.dialCode + national,
        };
      }
    }
    return {
      countryCode: "",
      nationalNumber: digitsOnly,
      fullPhone: digitsOnly,
    };
  }

  const sortedRules = [...COUNTRY_RULES].sort((a, b) => b.dialCode.length - a.dialCode.length);
  for (const r of sortedRules) {
    if (clean.startsWith(r.dialCode)) {
      const national = clean.slice(r.dialCode.length).replace(/\D/g, "");
      return {
        countryCode: r.dialCode,
        nationalNumber: national,
        fullPhone: r.dialCode + national,
      };
    }
  }

  // Generic fallback if not matched
  const match = clean.match(/^\+(\d{1,4})/);
  if (match) {
    const dial = "+" + match[1];
    const national = clean.slice(dial.length).replace(/\D/g, "");
    return {
      countryCode: dial,
      nationalNumber: national,
      fullPhone: dial + national,
    };
  }

  const digits = clean.replace(/\D/g, "");
  return {
    countryCode: "",
    nationalNumber: digits,
    fullPhone: digits,
  };
}

module.exports = {
  isValidPhoneNumber,
  parsePhoneString,
  COUNTRY_RULES,
};
