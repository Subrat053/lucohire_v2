const ALLOWED_PLATFORM_DOMAINS = [
  'linkedin.com',
  'github.com',
  'behance.net',
  'dribbble.com',
  'instagram.com',
  'youtube.com'
];

/**
 * Detects platform name from a given URL.
 * Falls back to "website" if standard domain is not matched.
 */
const detectPlatform = (urlStr) => {
  if (!urlStr || typeof urlStr !== 'string') return 'website';
  const sanitized = urlStr.trim().toLowerCase();
  
  for (const domain of ALLOWED_PLATFORM_DOMAINS) {
    if (sanitized.includes(domain)) {
      return domain.split('.')[0]; // returns e.g. "linkedin", "github"
    }
  }
  return 'website';
};

/**
 * Validates and sanitizes a portfolio URL.
 * Returns { isValid: boolean, sanitizedUrl: string, error?: string }
 */
const validateAndSanitizeUrl = (urlStr) => {
  if (!urlStr || typeof urlStr !== 'string') {
    return { isValid: false, sanitizedUrl: '', error: 'URL must be a non-empty string' };
  }

  let trimmedUrl = urlStr.trim();

  // Strip harmful javascript: or data: protocols
  const lowerUrl = trimmedUrl.toLowerCase();
  if (lowerUrl.includes('javascript:') || lowerUrl.includes('data:') || lowerUrl.includes('<script>')) {
    return { isValid: false, sanitizedUrl: '', error: 'Harmful protocol or script injection detected' };
  }

  // Enforce protocol prefix or fallback to https://
  if (!/^https?:\/\//i.test(trimmedUrl)) {
    trimmedUrl = `https://${trimmedUrl}`;
  }

  try {
    const parsed = new URL(trimmedUrl);
    
    // Ensure only http or https is allowed
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { isValid: false, sanitizedUrl: '', error: 'Only HTTP and HTTPS protocols are allowed' };
    }

    // Domain validation to check if the hostname is syntactically sound
    const host = parsed.hostname.toLowerCase();
    if (!host || !host.includes('.')) {
      return { isValid: false, sanitizedUrl: '', error: 'Invalid domain structure' };
    }

    // Platform-specific domain checks
    const detected = detectPlatform(trimmedUrl);
    if (detected !== 'website') {
      const matchedDomain = ALLOWED_PLATFORM_DOMAINS.find(d => detected === d.split('.')[0]);
      if (matchedDomain && !host.endsWith(matchedDomain) && !host.includes(`.${matchedDomain}`)) {
        return { isValid: false, sanitizedUrl: '', error: `URL domain does not match platform ${detected}` };
      }
    }

    return { isValid: true, sanitizedUrl: parsed.href };
  } catch (err) {
    return { isValid: false, sanitizedUrl: '', error: 'Invalid URL format' };
  }
};

/**
 * Placeholder safety verification service for spam or malware checks.
 * Easily integrable with external safety APIs later.
 */
const verifyUrlSafety = async (urlStr) => {
  // Currently mock validation (can be integrated with Google Safe Browsing / WebRisk APIs)
  const isSuspicious = /spam|malware|phishing|virus/i.test(urlStr);
  if (isSuspicious) {
    return { isSafe: false, reason: 'Flagged as high-risk spam or malware by automated filter' };
  }
  return { isSafe: true };
};

module.exports = {
  detectPlatform,
  validateAndSanitizeUrl,
  verifyUrlSafety,
  ALLOWED_PLATFORM_DOMAINS
};
