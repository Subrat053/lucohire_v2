const { ROLE_DEFINITIONS } = require('../../../utils/serviceRoleDictionary');
const { CITY_DICTIONARY } = require('../../../utils/locationDictionary');

const NUMBER_WORDS = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  ek: 1,
  do: 2,
  teen: 3,
  tin: 3,
  char: 4,
  chaar: 4,
  panch: 5,
  paanch: 5,
  cheh: 6,
  chhe: 6,
  saat: 7,
  sat: 7,
  aath: 8,
  ath: 8,
  nau: 9,
  das: 10,
  gyarah: 11,
  gyaarah: 11,
  barah: 12,
  baarah: 12,
  aadha: 0.5,
  half: 0.5,
};

const LANGUAGE_DICTIONARY = {
  Hindi: ['hindi'],
  English: ['english', 'inglish'],
  Odia: ['odia', 'oriya'],
  Bengali: ['bangla', 'bengali'],
  Tamil: ['tamil'],
  Telugu: ['telugu'],
  Urdu: ['urdu'],
  Punjabi: ['punjabi'],
  Marathi: ['marathi'],
  Gujarati: ['gujarati'],
  Kannada: ['kannada'],
  Malayalam: ['malayalam'],
};

const CATEGORY_PRICING = {
  Painting: { min: 500, max: 2500 },
  Electrical: { min: 300, max: 2000 },
  Plumbing: { min: 300, max: 2200 },
  Carpentry: { min: 400, max: 2500 },
  Cleaning: { min: 400, max: 1800 },
  Driving: { min: 500, max: 2500 },
  'Appliance Repair': { min: 400, max: 2600 },
  'Beauty Services': { min: 500, max: 3500 },
  General: { min: 300, max: 1500 },
};

const EXPERIENCE_YEAR_UNITS = ['saal', 'sal', 'year', 'years', 'yr', 'yrs'];
const EXPERIENCE_MONTH_UNITS = ['mahina', 'mahine', 'month', 'months', 'mo'];

const escapeRegExp = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const unique = (items) => Array.from(new Set((items || []).filter(Boolean)));

function normalizeText(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toTitleCase(value) {
  return String(value || '')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
    .trim();
}

function parseNumberToken(token) {
  const normalized = String(token || '').toLowerCase().trim();
  if (!normalized) return null;

  if (/^\d+(\.\d+)?$/.test(normalized)) {
    const numeric = Number(normalized);
    return Number.isFinite(numeric) ? numeric : null;
  }

  if (Object.prototype.hasOwnProperty.call(NUMBER_WORDS, normalized)) {
    return NUMBER_WORDS[normalized];
  }

  return null;
}

function formatExperienceLabel(totalMonths) {
  const months = Math.max(0, Number(totalMonths || 0));
  if (!Number.isFinite(months) || months <= 0) return '';

  const wholeMonths = Math.round(months);
  const years = Math.floor(wholeMonths / 12);
  const remMonths = wholeMonths % 12;

  if (years > 0 && remMonths > 0) {
    return `${years} year${years > 1 ? 's' : ''} ${remMonths} month${remMonths > 1 ? 's' : ''}`;
  }

  if (years > 0) {
    return `${years} year${years > 1 ? 's' : ''}`;
  }

  return `${remMonths} month${remMonths > 1 ? 's' : ''}`;
}

function extractExperienceMonths(normalizedText) {
  let totalMonths = 0;
  let found = false;

  const yearRegex = new RegExp(`(?:^|\\s)(\\d+(?:\\.\\d+)?|[a-z]+)\\s*(${EXPERIENCE_YEAR_UNITS.join('|')})\\b`, 'g');
  const monthRegex = new RegExp(`(?:^|\\s)(\\d+(?:\\.\\d+)?|[a-z]+)\\s*(${EXPERIENCE_MONTH_UNITS.join('|')})\\b`, 'g');

  for (const match of normalizedText.matchAll(yearRegex)) {
    const years = parseNumberToken(match[1]);
    if (years !== null) {
      totalMonths += years * 12;
      found = true;
    }
  }

  for (const match of normalizedText.matchAll(monthRegex)) {
    const months = parseNumberToken(match[1]);
    if (months !== null) {
      totalMonths += months;
      found = true;
    }
  }

  if (!found) {
    const halfYearRegex = /(?:aadha|half)\s*(?:saal|sal|year|years)\b/g;
    const halfMatches = normalizedText.match(halfYearRegex) || [];
    if (halfMatches.length > 0) {
      totalMonths += halfMatches.length * 6;
      found = true;
    }
  }

  const roundedMonths = Math.max(0, Math.round(totalMonths));
  return {
    experienceMonths: roundedMonths,
    experienceLabel: formatExperienceLabel(roundedMonths),
    confidence: found ? 0.95 : 0.1,
  };
}

function detectLanguages(normalizedText, existingLanguages = []) {
  const detected = [];

  Object.entries(LANGUAGE_DICTIONARY).forEach(([canonical, aliases]) => {
    const matched = aliases.some((alias) => {
      const pattern = new RegExp(`(?:^|\\b)${escapeRegExp(alias)}(?:\\b|$)`, 'i');
      return pattern.test(normalizedText);
    });

    if (matched) detected.push(canonical);
  });

  return {
    languages: unique([...existingLanguages, ...detected]),
    confidence: detected.length > 0 ? Math.min(1, 0.55 + (detected.length * 0.15)) : 0.1,
  };
}

function detectRole(normalizedText) {
  let best = null;

  ROLE_DEFINITIONS.forEach((definition) => {
    let score = 0;
    const matchedSynonyms = [];

    definition.synonyms.forEach((synonym) => {
      const normalizedSynonym = normalizeText(synonym);
      if (!normalizedSynonym) return;

      const pattern = new RegExp(`(?:^|\\b)${escapeRegExp(normalizedSynonym)}(?:\\b|$)`, 'i');
      if (pattern.test(normalizedText)) {
        matchedSynonyms.push(synonym);
        score += normalizedSynonym.split(' ').length > 1 ? 1.2 : 1;
      }
    });

    if (score <= 0) return;

    const confidence = Math.min(1, 0.45 + (score * 0.15));
    const candidate = {
      key: definition.key,
      roleLabel: definition.roleLabel,
      category: definition.category,
      inferredSkills: definition.inferredSkills,
      matchedSynonyms,
      score,
      confidence,
    };

    if (!best || candidate.score > best.score) {
      best = candidate;
    }
  });

  return best;
}

function detectCity(normalizedText) {
  const sortedCityEntries = CITY_DICTIONARY
    .flatMap((entry) => entry.aliases.map((alias) => ({ city: entry.city, alias: normalizeText(alias) })))
    .sort((a, b) => b.alias.length - a.alias.length);

  for (const entry of sortedCityEntries) {
    const aliasPattern = escapeRegExp(entry.alias);
    const contextualPattern = new RegExp(`(?:in|from|near|at)\\s+${aliasPattern}|${aliasPattern}\\s+(?:me|mein|mai)`, 'i');
    const genericPattern = new RegExp(`(?:^|\\b)${aliasPattern}(?:\\b|$)`, 'i');

    if (contextualPattern.test(normalizedText)) {
      return { city: entry.city, confidence: 0.95, matchedAlias: entry.alias };
    }
    if (genericPattern.test(normalizedText)) {
      return { city: entry.city, confidence: 0.82, matchedAlias: entry.alias };
    }
  }

  return { city: '', confidence: 0.1, matchedAlias: '' };
}

function inferPricingRange(category, experienceMonths) {
  const pricing = CATEGORY_PRICING[category] || CATEGORY_PRICING.General;
  const months = Number(experienceMonths || 0);

  let multiplier = 1;
  if (months >= 60) multiplier = 1.35;
  else if (months >= 24) multiplier = 1.2;
  else if (months >= 12) multiplier = 1.1;
  else if (months > 0 && months < 6) multiplier = 0.95;

  const roundTo50 = (value) => Math.max(0, Math.round(value / 50) * 50);

  return {
    min: roundTo50(pricing.min * multiplier),
    max: roundTo50(pricing.max * multiplier),
    currency: 'INR',
  };
}

function inferSkills(roleData, existingSkills = []) {
  if (!roleData) return unique(existingSkills).slice(0, 8);
  return unique([...existingSkills, ...roleData.inferredSkills]).slice(0, 8);
}

function generateHeadline({ roleData, city, languages }) {
  if (roleData && city) {
    return `Professional ${roleData.roleLabel} in ${city}`;
  }

  if (roleData && languages.length > 0) {
    return `${languages[0]}-Speaking ${roleData.roleLabel}`;
  }

  if (roleData) {
    return `${roleData.roleLabel} Available for Service Work`;
  }

  if (city) {
    return `Service Provider Available in ${city}`;
  }

  return 'Service Provider Profile';
}

function generateDescription({ roleData, city, languages, experienceLabel }) {
  const rolePhrase = roleData ? roleData.roleLabel.toLowerCase() : 'service professional';
  const expPart = experienceLabel ? `with ${experienceLabel} of hands-on experience` : 'ready to support nearby clients';
  const cityPart = city ? `Available in ${city}` : 'Available for service work across nearby areas';
  const languagePart = languages.length > 0
    ? `Can communicate in ${languages.join(', ')}`
    : 'Language preferences can be shared on request';

  return `${toTitleCase(rolePhrase)} ${expPart}. ${cityPart}. ${languagePart}.`;
}

function inferMissingFields(output) {
  const missing = [];
  if (!output.city) missing.push('city');
  if (!Array.isArray(output.languages) || output.languages.length === 0) missing.push('languages');
  if (!Array.isArray(output.portfolioLinks) || output.portfolioLinks.length === 0) missing.push('portfolioLinks');
  if (!Number(output.experienceMonths)) missing.push('experience');
  if (!Array.isArray(output.skills) || output.skills.length === 0) missing.push('skills');
  return unique(missing);
}

function parseProfileText({ freeText, existingSkills = [], existingLanguages = [], portfolioLinks = [], designation, company, tier, experience, city, state } = {}) {
  const rawText = String(freeText || '').trim();
  const normalizedText = normalizeText(rawText);

  const roleData = detectRole(normalizedText) || (designation ? { roleLabel: designation, category: designation, inferredSkills: [] } : null);
  let cityData = detectCity(normalizedText);
  if (!cityData.city && city) cityData = { city: city, confidence: 0.8, matchedAlias: city };
  const languageData = detectLanguages(normalizedText, existingLanguages);
  let experienceData = extractExperienceMonths(normalizedText);
  if (!experienceData.experienceMonths && experience) {
    const months = Number(experience) * 12;
    if (months > 0) experienceData = { experienceMonths: months, experienceLabel: formatExperienceLabel(months), confidence: 0.8 };
  }

  const skills = inferSkills(roleData, existingSkills);
  const category = roleData?.category || '';

  const output = {
    headline: generateHeadline({ roleData, city: cityData.city, languages: languageData.languages }),
    description: generateDescription({
      roleData,
      city: cityData.city,
      languages: languageData.languages,
      experienceLabel: experienceData.experienceLabel,
    }),
    skills,
    languages: languageData.languages,
    city: cityData.city,
    experienceMonths: experienceData.experienceMonths,
    experienceLabel: experienceData.experienceLabel,
    category,
    suggestedPricingRange: inferPricingRange(category, experienceData.experienceMonths),
    portfolioLinks: Array.isArray(portfolioLinks) ? portfolioLinks.filter(Boolean) : [],
    missingFields: [],
  };

  output.missingFields = inferMissingFields(output);

  return {
    data: output,
    confidence: {
      role: Number(roleData?.confidence || 0.1),
      city: Number(cityData.confidence || 0.1),
      languages: Number(languageData.confidence || 0.1),
      experience: Number(experienceData.confidence || 0.1),
      overall: Number(((Number(roleData?.confidence || 0.1)
        + Number(cityData.confidence || 0.1)
        + Number(languageData.confidence || 0.1)
        + Number(experienceData.confidence || 0.1)) / 4).toFixed(2)),
    },
    parserMeta: {
      matchedRoleKey: roleData?.key || '',
      matchedRoleSynonyms: roleData?.matchedSynonyms || [],
      matchedCityAlias: cityData.matchedAlias || '',
      normalizedText,
    },
  };
}

module.exports = {
  parseProfileText,
  formatExperienceLabel,
  normalizeText,
};
