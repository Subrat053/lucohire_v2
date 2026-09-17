const { parseProviderMessage } = require('./providerParser');
const { detectProviderIntent } = require('./providerIntentService');
const { generateStructuredProviderReply } = require('./llmService');

function unique(values) {
  return Array.from(new Set((values || []).filter(Boolean)));
}

function monthsToLabel(months) {
  const total = Math.max(0, Number(months || 0));
  if (!total) return '';

  const years = Math.floor(total / 12);
  const rem = total % 12;

  if (years > 0 && rem > 0) return `${years} year ${rem} months`;
  if (years > 0) return `${years} years`;
  return `${rem} months`;
}

function estimatePricing(skill) {
  const map = {
    Electrician: 'INR 500 - 1800 per visit',
    Plumber: 'INR 400 - 1600 per visit',
    Carpenter: 'INR 600 - 2200 per visit',
    'Cleaning / Sweeper': 'INR 300 - 1000 per visit',
    'Maid / House Help': 'INR 7000 - 18000 per month',
  };

  return map[skill] || 'INR 400 - 1500 (depends on scope and city)';
}

function buildHeadline({ skill, city, experienceMonths }) {
  const experienceLabel = monthsToLabel(experienceMonths);
  if (skill && city && experienceLabel) {
    return `${skill} available in ${city} | ${experienceLabel} experience`;
  }
  if (skill && city) return `${skill} service provider in ${city}`;
  if (skill) return `${skill} service provider`;
  return 'Service provider available for local work';
}

function buildDescription({ skill, city, experienceMonths, language }) {
  const parts = [];
  if (skill) parts.push(`I work as a ${skill.toLowerCase()} professional`);
  if (city) parts.push(`currently serving clients in ${city}`);
  if (experienceMonths > 0) parts.push(`with around ${monthsToLabel(experienceMonths)} of practical experience`);
  if (language) parts.push(`and can communicate in ${language}`);

  if (!parts.length) {
    return 'Reliable service provider focused on quality work, clear communication, and on-time support.';
  }

  return `${parts.join(', ')}. I focus on quality work and professional client communication.`;
}

function getMissingFields(output) {
  const missing = [];
  if (!output.detectedLocation) missing.push('city');
  if (!output.skills.length) missing.push('skills');
  if (!output.yearsOfExperience) missing.push('experience');
  return missing;
}

async function buildProviderProfileSuggestion({ freeText, existingSkills = [], existingLanguages = [], profileContext = {} }) {
  const ProviderAIProfile = require('../../models/ProviderAIProfile');
  const { searchPlaces, getPlaceDetails } = require('../googlePlacesService');

  // Check cache first to optimize cost and performance
  try {
    const cachedResult = await ProviderAIProfile.findOne({ rawInput: freeText }).lean();
    if (cachedResult) {
      return {
        source: 'cache',
        data: cachedResult.generatedProfile,
        debug: {
          usedLLM: false,
          cached: true,
          parserMatched: ['cache']
        }
      };
    }
  } catch (cacheErr) {
    console.warn('[Profile AI Cache Read Error]', cacheErr.message);
  }

  const parsed = parseProviderMessage({ message: freeText, profileContext });

  // Normalize parsed location through Google Places API
  if (parsed.extracted.city) {
    try {
      const places = await searchPlaces(parsed.extracted.city);
      if (places && places.length > 0) {
        const details = await getPlaceDetails(places[0].placeId);
        if (details && (details.city || details.name)) {
          parsed.extracted.city = details.city || details.name;
        }
      }
    } catch (locErr) {
      console.warn('[Profile AI] Location normalization failed:', locErr.message);
    }
  }

  const intent = detectProviderIntent({ message: freeText, extracted: parsed.extracted });

  const baseOutput = {
    headline: buildHeadline(parsed.extracted),
    description: buildDescription(parsed.extracted),
    category: parsed.extracted.category || parsed.extracted.skill,
    skills: unique([...existingSkills, parsed.extracted.skill]).slice(0, 8),
    suggestedPricingRange: estimatePricing(parsed.extracted.skill),
    detectedLocation: parsed.extracted.city,
    yearsOfExperience: Number((Number(parsed.extracted.experienceMonths || 0) / 12).toFixed(2)),
    experienceMonths: Number(parsed.extracted.experienceMonths || 0),
    experienceLabel: monthsToLabel(parsed.extracted.experienceMonths || 0),
    language: parsed.extracted.language || (existingLanguages[0] || ''),
    missingFields: [],
  };

  baseOutput.missingFields = getMissingFields(baseOutput);

  const llmAttempt = await generateStructuredProviderReply({
    message: freeText,
    intent,
    extracted: parsed.extracted,
    profileContext,
    recentMessages: [],
  });

  const outputData = {
    ...baseOutput,
    headline: llmAttempt.output?.headline || baseOutput.headline,
    description: llmAttempt.output?.description || baseOutput.description,
    suggestedPricingRange: llmAttempt.output?.suggestedPricingRange || baseOutput.suggestedPricingRange,
    missingFields: Array.isArray(llmAttempt.output?.missingFields)
      ? llmAttempt.output.missingFields
      : baseOutput.missingFields,
    // Attach LLM extracted parameters for front-end draft mapping
    extracted: llmAttempt.output ? {
      name: llmAttempt.output.name || null,
      skill: llmAttempt.output.skill || null,
      tier: llmAttempt.output.tier || null,
      experience: llmAttempt.output.experience || null,
      location: llmAttempt.output.location || null,
      phone: llmAttempt.output.phone || null,
      pricing: llmAttempt.output.pricing || null,
      pricingType: llmAttempt.output.pricingType || null,
      description: llmAttempt.output.description || null,
      languages: Array.isArray(llmAttempt.output.languages) ? llmAttempt.output.languages : (llmAttempt.output.languages ? [llmAttempt.output.languages] : []),
    } : null,
  };

  // Cache successfully generated suggestions
  if (llmAttempt.used && llmAttempt.output) {
    try {
      const providerId = profileContext.providerId || profileContext.userId;
      if (providerId) {
        await ProviderAIProfile.findOneAndUpdate(
          { providerId },
          {
            rawInput: freeText,
            generatedProfile: outputData,
            model: llmAttempt.provider || 'openai',
            source: llmAttempt.provider === 'anthropic' ? 'claude' : 'fallback',
            status: 'success'
          },
          { upsert: true, new: true }
        );
      }
    } catch (cacheWriteErr) {
      console.warn('[Profile AI Cache Write Error]', cacheWriteErr.message);
    }
  }

  return {
    source: llmAttempt.used ? 'llm' : 'fallback',
    data: outputData,
    debug: {
      usedLLM: Boolean(llmAttempt.used),
      fallbackReason: llmAttempt.used ? '' : (llmAttempt.reason || 'Fallback parser used'),
      parserMatched: parsed.parserMatched,
    },
  };
}

module.exports = {
  buildProviderProfileSuggestion,
};
