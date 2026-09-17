const { parseProfileText, formatExperienceLabel } = require('./profileParser');
const { enhanceWithLLM } = require('./llmEnhancer');

const ALLOWED_MISSING_FIELDS = new Set(['city', 'languages', 'portfolioLinks', 'experience', 'skills']);

function sanitizeString(value, fallback = '') {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function sanitizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((item) => String(item || '').trim()).filter(Boolean)));
}

function normalizeMissingFields(data) {
  const missing = [];

  if (!data.city) missing.push('city');
  if (!data.languages.length) missing.push('languages');
  if (!data.portfolioLinks.length) missing.push('portfolioLinks');
  if (!data.experienceMonths) missing.push('experience');
  if (!data.skills.length) missing.push('skills');

  return Array.from(new Set(missing)).filter((item) => ALLOWED_MISSING_FIELDS.has(item));
}

function validateProfileOutput(input) {
  const safe = {
    headline: sanitizeString(input?.headline, 'Service Provider Profile'),
    description: sanitizeString(input?.description, 'Professional service provider profile generated from your intro.'),
    skills: sanitizeStringArray(input?.skills),
    languages: sanitizeStringArray(input?.languages),
    city: sanitizeString(input?.city, ''),
    experienceMonths: Math.max(0, Math.round(Number(input?.experienceMonths || 0))),
    experienceLabel: sanitizeString(input?.experienceLabel, ''),
    category: sanitizeString(input?.category, ''),
    suggestedPricingRange: {
      min: Math.max(0, Math.round(Number(input?.suggestedPricingRange?.min || 0))),
      max: Math.max(0, Math.round(Number(input?.suggestedPricingRange?.max || 0))),
      currency: 'INR',
    },
    portfolioLinks: sanitizeStringArray(input?.portfolioLinks),
    missingFields: [],
  };

  if (!safe.experienceLabel && safe.experienceMonths > 0) {
    safe.experienceLabel = formatExperienceLabel(safe.experienceMonths);
  }

  if (safe.suggestedPricingRange.max < safe.suggestedPricingRange.min) {
    safe.suggestedPricingRange.max = safe.suggestedPricingRange.min;
  }

  safe.missingFields = normalizeMissingFields(safe);

  return safe;
}

async function buildProfileFromText({ freeText, existingSkills = [], existingLanguages = [], portfolioLinks = [], designation, company, tier, experience, city, state } = {}) {
  const parsed = parseProfileText({ freeText, existingSkills, existingLanguages, portfolioLinks, designation, company, tier, experience, city, state });

  const llmResult = await enhanceWithLLM(parsed.data, {
    timeoutMs: Number(process.env.PROFILE_BUILDER_LLM_TIMEOUT_MS || 5000),
  });

  const validated = validateProfileOutput(llmResult.data || parsed.data);

  // --- Step 8: Resolve detected city to Google Places ---
  if (validated.city) {
    try {
      const { searchPlaces, getPlaceDetails } = require('../../googlePlacesService');
      const places = await searchPlaces(validated.city);
      if (places.length > 0) {
        const details = await getPlaceDetails(places[0].placeId);
        validated.location = details;
        // Use the most specific name available (e.g., Rasulgarh) but keep city for context if needed
        validated.city = details.name || details.city || validated.city;
      } else {

        // Fallback for AI-only location
        validated.location = {
          name: validated.city,
          formattedAddress: validated.city,
          source: 'ai_fallback',
        };
      }
    } catch (err) {
      console.warn('AI location resolution failed:', err.message);
      // Ensure location object exists even on error
      validated.location = {
        name: validated.city,
        formattedAddress: validated.city,
        source: 'ai_fallback_error',
      };
    }
  }

  return {
    source: llmResult.source || 'rule_based',
    data: validated,
    confidence: parsed.confidence,
    parserMeta: parsed.parserMeta,
  };
}


module.exports = {
  buildProfileFromText,
  validateProfileOutput,
};
