const { CITY_DICTIONARY } = require('../../utils/locationDictionary');

const SKILL_MAPPINGS = [
  {
    canonical: 'Cleaning / Sweeper',
    category: 'Cleaning',
    aliases: ['sweeper', 'safai', 'cleaning', 'cleaner', 'housekeeping', 'house keeping', 'jhaadu', 'jhadu', 'pocha', 'maid cleaning'],
  },
  {
    canonical: 'Carpenter',
    category: 'Carpentry',
    aliases: ['carpenter', 'carpainter', 'carpentor', 'wood work', 'woodwork', 'furniture work', 'badhai'],
  },
  {
    canonical: 'Electrician',
    category: 'Electrical',
    aliases: ['electrician', 'electritian', 'electrcian', 'electric', 'wiring', 'wireman', 'bijli'],
  },
  {
    canonical: 'Plumber',
    category: 'Plumbing',
    aliases: ['plumber', 'plumbing', 'plumbr', 'pipe fitting', 'pipeline', 'nal ka kaam'],
  },
  {
    canonical: 'Maid / House Help',
    category: 'House Help',
    aliases: ['maid', 'househelp', 'house help', 'domestic help', 'helper', 'ghar ka kaam'],
  },
  {
    canonical: 'Painter',
    category: 'Painting',
    aliases: ['painter', 'painting', 'paint', 'rang ka kaam'],
  },
  {
    canonical: 'Driver',
    category: 'Driving',
    aliases: ['driver', 'driving', 'gaadi chalata', 'chauffeur'],
  },
];

const LANGUAGE_HINTS = {
  Hindi: ['hindi'],
  English: ['english', 'inglish'],
  Hinglish: ['hinglish'],
  Odia: ['odia', 'oriya'],
  Bengali: ['bangla', 'bengali'],
  Telugu: ['telugu'],
  Tamil: ['tamil'],
  Marathi: ['marathi'],
  Urdu: ['urdu'],
};

const URGENCY_HINTS = [
  { value: 'immediate', tokens: ['urgent', 'jaldi', 'immediately', 'asap', 'aaj hi', 'abhi'] },
  { value: 'within_week', tokens: ['this week', 'hafte', 'week', 'jaldi chahiye'] },
  { value: 'flexible', tokens: ['koi jaldi nahi', 'flexible', 'normal'] },
];

function normalizeText(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleCase(value) {
  return String(value || '')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
    .trim();
}

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function detectSkill(normalizedText) {
  for (const mapping of SKILL_MAPPINGS) {
    for (const alias of mapping.aliases) {
      const safeAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rx = new RegExp(`(?:^|\\b)${safeAlias}(?:\\b|$)`, 'i');
      if (rx.test(normalizedText)) {
        return {
          skill: mapping.canonical,
          category: mapping.category,
          matchedAlias: alias,
        };
      }
    }
  }

  return { skill: '', category: '', matchedAlias: '' };
}

function detectCity(normalizedText) {
  const cityAliases = CITY_DICTIONARY
    .flatMap((entry) => entry.aliases.map((alias) => ({ city: entry.city, alias: normalizeText(alias) })))
    .sort((a, b) => b.alias.length - a.alias.length);

  for (const item of cityAliases) {
    const safeAlias = item.alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const contextual = new RegExp(`(?:\\b${safeAlias}\\b\\s*(?:me|mein|mai|main|in|near)\\b)|(?:\\b(?:in|near|from)\\s+${safeAlias}\\b)`, 'i');
    const generic = new RegExp(`(?:^|\\b)${safeAlias}(?:\\b|$)`, 'i');

    if (contextual.test(normalizedText) || generic.test(normalizedText)) {
      return { city: item.city, matchedAlias: item.alias };
    }
  }

  const mePattern = /\b([a-z]{3,}(?:\s+[a-z]{3,}){0,2})\s+(?:me|mein|mai)\b/i;
  const meMatch = normalizedText.match(mePattern);
  if (meMatch) {
    return { city: titleCase(meMatch[1]), matchedAlias: meMatch[1] };
  }

  return { city: '', matchedAlias: '' };
}

function detectExperienceMonths(normalizedText) {
  let months = 0;
  const matches = [];

  const yearRegex = /(\d+)\s*(saal|sal|year|years|yr|yrs)\b/gi;
  const monthRegex = /(\d+)\s*(mahina|mahine|month|months|mon|mos)\b/gi;

  for (const match of normalizedText.matchAll(yearRegex)) {
    months += toNumber(match[1]) * 12;
    matches.push(match[0]);
  }

  for (const match of normalizedText.matchAll(monthRegex)) {
    months += toNumber(match[1]);
    matches.push(match[0]);
  }

  return {
    experienceMonths: Math.max(0, Math.round(months)),
    matches,
  };
}

function detectBudget(rawText) {
  const text = String(rawText || '');
  const budgetPattern = /(₹|rs\.?|inr)?\s*\b(\d{3,6})\b(?:\s*[-to]+\s*\b(\d{3,6})\b)?/i;
  const match = text.match(budgetPattern);
  if (!match) return '';

  const min = match[2];
  const max = match[3];
  if (max) return `INR ${min}-${max}`;
  return `INR ${min}`;
}

function detectUrgency(normalizedText) {
  for (const hint of URGENCY_HINTS) {
    if (hint.tokens.some((token) => normalizedText.includes(token))) {
      return hint.value;
    }
  }
  return '';
}

function detectLanguage(normalizedText) {
  for (const [canonical, aliases] of Object.entries(LANGUAGE_HINTS)) {
    if (aliases.some((alias) => normalizedText.includes(alias))) {
      return canonical;
    }
  }

  if (/[\u0900-\u097F]/.test(normalizedText)) {
    return 'Hindi';
  }

  return '';
}

function parseProviderMessage({ message, profileContext = {} }) {
  const rawText = String(message || '').trim();
  const normalized = normalizeText(rawText);

  const parserMatched = [];

  const skillData = detectSkill(normalized);
  if (skillData.skill) parserMatched.push('skill');

  const cityData = detectCity(normalized);
  if (cityData.city) parserMatched.push('city');

  const expData = detectExperienceMonths(normalized);
  if (expData.experienceMonths > 0) parserMatched.push('experience');

  const budget = detectBudget(rawText);
  if (budget) parserMatched.push('budget');

  const urgency = detectUrgency(normalized);
  if (urgency) parserMatched.push('urgency');

  const language = detectLanguage(normalized);
  if (language) parserMatched.push('language');

  return {
    rawText,
    normalized,
    extracted: {
      skill: skillData.skill || String(profileContext.skill || profileContext.category || '').trim(),
      city: cityData.city || String(profileContext.city || '').trim(),
      experienceMonths: expData.experienceMonths || Number(profileContext.experienceMonths || 0),
      budget,
      urgency,
      language,
      category: skillData.category || String(profileContext.category || '').trim(),
    },
    parserMatched,
    parserMeta: {
      cityAlias: cityData.matchedAlias,
      skillAlias: skillData.matchedAlias,
      experienceMatches: expData.matches,
    },
  };
}

module.exports = {
  parseProviderMessage,
  normalizeText,
};
