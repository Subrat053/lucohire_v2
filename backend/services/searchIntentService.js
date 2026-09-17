const SkillCategory = require('../models/SkillCategory');
const SkillSynonym = require('../models/SkillSynonym');
const JobSearchIntent = require('../models/JobSearchIntent');
const FeatureFlag = require('../models/FeatureFlag');
const { CITY_DICTIONARY } = require('../utils/locationDictionary');
const { interpretSearchIntent } = require('./aiAssistService');

const INTENT_CACHE_TTL_MS = 60_000;
let skillCache = { expiresAt: 0, entries: [] };
let aiSearchFlagCache = { expiresAt: 0, enabled: true };

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const normalizeForSearch = (value) => normalizeText(value)
  .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()!?]/g, "")
  .replace(/\s+/g, ' ')
  .trim();

const SKILL_MAPPINGS = [
  {
    canonical: 'Cleaning / Sweeper',
    aliases: ['sweeper', 'safai', 'cleaning', 'cleaner', 'housekeeping', 'house keeping', 'jhaadu', 'jhadu', 'pocha', 'maid cleaning'],
  },
  {
    canonical: 'Carpenter',
    aliases: ['carpenter', 'carpainter', 'carpentor', 'wood work', 'woodwork', 'furniture work', 'badhai'],
  },
  {
    canonical: 'Electrician',
    aliases: ['electrician', 'electritian', 'electrcian', 'electric', 'wiring', 'wireman', 'bijli'],
  },
  {
    canonical: 'Plumber',
    aliases: ['plumber', 'plumbing', 'plumbr', 'pipe fitting', 'pipeline', 'nal ka kaam'],
  },
  {
    canonical: 'Maid / House Help',
    aliases: ['maid', 'househelp', 'house help', 'domestic help', 'helper', 'ghar ka kaam'],
  },
  {
    canonical: 'Painter',
    aliases: ['painter', 'painting', 'paint', 'rang ka kaam'],
  },
  {
    canonical: 'Driver',
    aliases: ['driver', 'driving', 'gaadi chalata', 'chauffeur'],
  },
  {
    canonical: 'Cook',
    aliases: ['cook', 'cooking', 'chef', 'khana banane wala', 'bawarchi'],
  },
  {
    canonical: 'AC Technician',
    aliases: ['ac technician', 'ac repair', 'ac mechanic', 'air conditioner', 'fridge repair', 'cooling repair'],
  },
];

const CITY_ALIASES = CITY_DICTIONARY
  .flatMap((entry) => entry.aliases.map((alias) => ({ city: entry.city, alias: normalizeForSearch(alias) })))
  .sort((a, b) => b.alias.length - a.alias.length);

const parseLooseNumber = (rawValue) => {
  const text = normalizeText(rawValue);
  if (!text) return null;

  const numeric = Number(text.replace(/,/g, ''));
  if (Number.isFinite(numeric)) return numeric;

  const kMatch = text.match(/(\d+(?:\.\d+)?)\s*k/);
  if (kMatch) return Math.round(Number(kMatch[1]) * 1000);

  const lMatch = text.match(/(\d+(?:\.\d+)?)\s*(l|lac|lakh)/);
  if (lMatch) return Math.round(Number(lMatch[1]) * 100000);

  return null;
};

const detectUrgency = (normalizedQuery) => {
  if (!normalizedQuery) return '';
  if (/(immediate|urgent|asap|now|today|jaldi|turant)/.test(normalizedQuery)) return 'immediate';
  if (/(high priority|priority)/.test(normalizedQuery)) return 'high';
  if (/(later|no hurry|whenever)/.test(normalizedQuery)) return 'low';
  return 'normal';
};

const detectShiftType = (normalizedQuery) => {
  if (/(full\s*time)/.test(normalizedQuery)) return 'full_time';
  if (/(part\s*time)/.test(normalizedQuery)) return 'part_time';
  if (/(one\s*time|one-time|once)/.test(normalizedQuery)) return 'one_time';
  if (/(shift)/.test(normalizedQuery)) return 'shift';
  return '';
};

const detectTimeOfDay = (normalizedQuery) => {
  if (/(morning|subah)/.test(normalizedQuery)) return 'morning';
  if (/(afternoon)/.test(normalizedQuery)) return 'afternoon';
  if (/(evening|shaam)/.test(normalizedQuery)) return 'evening';
  if (/(night|raat)/.test(normalizedQuery)) return 'night';
  return '';
};

const detectBudget = (normalizedQuery) => {
  if (!normalizedQuery) return { min: null, max: null };

  const rangeMatch = normalizedQuery.match(/(\d+[\d,]*\s*(?:k|l|lac|lakh)?)\s*(?:to|-|–)\s*(\d+[\d,]*\s*(?:k|l|lac|lakh)?)/i);
  if (rangeMatch) {
    return {
      min: parseLooseNumber(rangeMatch[1]),
      max: parseLooseNumber(rangeMatch[2]),
    };
  }

  const underMatch = normalizedQuery.match(/(?:under|below|max|upto|up to)\s*(\d+[\d,]*\s*(?:k|l|lac|lakh)?)/i);
  if (underMatch) {
    return { min: null, max: parseLooseNumber(underMatch[1]) };
  }

  const aboveMatch = normalizedQuery.match(/(?:above|more than|min|at least)\s*(\d+[\d,]*\s*(?:k|l|lac|lakh)?)/i);
  if (aboveMatch) {
    return { min: parseLooseNumber(aboveMatch[1]), max: null };
  }

  return { min: null, max: null };
};

const extractCityFromQuery = (normalizedQuery) => {
  if (!normalizedQuery) return '';
  const inCityMatch = normalizedQuery.match(/(?:in|near|around)\s+([a-z\s]{2,40})/i);
  if (!inCityMatch) return '';

  const city = inCityMatch[1].trim().split(' ').slice(0, 3).join(' ');
  return city;
};

async function getSkillDictionary() {
  if (skillCache.expiresAt > Date.now()) {
    return skillCache.entries;
  }

  const [categories, synonyms] = await Promise.all([
    SkillCategory.find({ isActive: true }).lean(),
    SkillSynonym.find({ status: 'active' }).lean(),
  ]);

  const entries = [];

  for (const category of categories) {
    const skills = Array.isArray(category.skills) ? category.skills : [];
    for (const skill of skills) {
      const canonical = String(skill?.name || '').trim();
      if (!canonical) continue;
      entries.push({
        canonicalSkill: canonical,
        normalizedLabel: normalizeForSearch(canonical),
      });
    }
  }

  for (const synonym of synonyms) {
    const canonical = String(synonym.label || '').trim();
    const normalized = normalizeForSearch(synonym.normalizedLabel || synonym.label);
    if (!canonical || !normalized) continue;
    entries.push({
      canonicalSkill: canonical,
      normalizedLabel: normalized,
    });
  }

  skillCache = {
    entries,
    expiresAt: Date.now() + INTENT_CACHE_TTL_MS,
  };

  return entries;
}

async function isAISearchInterpretEnabled() {
  if (aiSearchFlagCache.expiresAt > Date.now()) {
    return aiSearchFlagCache.enabled;
  }

  const flag = await FeatureFlag.findOne({ key: 'ai.search_interpret' }).lean();
  const enabled = flag ? flag.enabled === true : true;
  aiSearchFlagCache = {
    enabled,
    expiresAt: Date.now() + INTENT_CACHE_TTL_MS,
  };
  return enabled;
}

async function detectSkill(normalizedQuery) {
  if (!normalizedQuery) return '';
  for (const mapping of SKILL_MAPPINGS) {
    for (const alias of mapping.aliases) {
      const safeAlias = normalizeForSearch(alias).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rx = new RegExp(`(?:^|\\b)${safeAlias}(?:\\b|$)`, 'i');
      if (rx.test(normalizedQuery)) {
        return mapping.canonical;
      }
    }
  }

  const dictionary = await getSkillDictionary();
  const match = dictionary.find((item) => normalizedQuery.includes(item.normalizedLabel));
  return match?.canonicalSkill || '';
}

function detectCity(normalizedQuery) {
  if (!normalizedQuery) return '';

  for (const item of CITY_ALIASES) {
    const safeAlias = item.alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const contextual = new RegExp(`(?:\\b${safeAlias}\\b\\s*(?:me|mein|mai|main|in|near|around|from|at)\\b)|(?:\\b(?:in|near|around|from|at)\\s+${safeAlias}\\b)`, 'i');
    const generic = new RegExp(`(?:^|\\b)${safeAlias}(?:\\b|$)`, 'i');

    if (contextual.test(normalizedQuery) || generic.test(normalizedQuery)) {
      return item.city;
    }
  }

  const mePattern = /\b([a-z]{3,}(?:\s+[a-z]{3,}){0,2})\s+(?:me|mein|mai|main)\b/i;
  const meMatch = normalizedQuery.match(mePattern);
  if (meMatch) {
    return meMatch[1]
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
      .trim();
  }

  return '';
}

function calcConfidence(intent) {
  let score = 0;
  if (intent.extractedSkill) score += 0.35;
  if (intent.extractedCity) score += 0.2;
  if (intent.extractedBudgetMin !== null || intent.extractedBudgetMax !== null) score += 0.15;
  if (intent.extractedUrgency && intent.extractedUrgency !== 'normal') score += 0.1;
  if (intent.extractedShiftType) score += 0.1;
  if (intent.extractedTimeOfDay) score += 0.1;
  return Math.max(0, Math.min(1, Number(score.toFixed(2))));
}

function buildSuggestedFilters(intent) {
  return {
    skill: intent.extractedSkill || undefined,
    city: intent.extractedCity || undefined,
    locality: intent.extractedLocality || undefined,
    budgetMin: intent.extractedBudgetMin ?? undefined,
    budgetMax: intent.extractedBudgetMax ?? undefined,
    urgency: intent.extractedUrgency || undefined,
    scheduleType: intent.extractedShiftType || undefined,
    timeOfDay: intent.extractedTimeOfDay || undefined,
  };
}

async function parseSearchIntent({ query, structured = {}, sourceUserId = null, sourceUserRole = null, allowAIFallback = true, locationContext = null }) {
  const rawQuery = String(query || '').trim() || 'All Providers';
  const normalizedQuery = normalizeForSearch(rawQuery);

  const extractedSkill = structured.skill || await detectSkill(normalizedQuery);
  let extractedCity = structured.city || detectCity(normalizedQuery) || extractCityFromQuery(normalizedQuery);
  let extractedLocality = structured.locality || '';
  const extractedUrgency = structured.urgency || detectUrgency(normalizedQuery);
  const budget = detectBudget(normalizedQuery);
  const extractedBudgetMin = structured.budgetMin ?? budget.min;
  const extractedBudgetMax = structured.budgetMax ?? budget.max;
  const extractedShiftType = structured.shiftType || detectShiftType(normalizedQuery);
  const extractedTimeOfDay = structured.timeOfDay || detectTimeOfDay(normalizedQuery);

  // Resolve coordinates bias using user locationContext on backend
  let resolvedLocation = null;
  if (locationContext) {
    try {
      const { resolveLocationForAI } = require('./aiLocationResolver');
      const targetLoc = extractedCity || extractedLocality || rawQuery;
      if (targetLoc) {
        resolvedLocation = await resolveLocationForAI(targetLoc, locationContext);
      }
    } catch (_) {}
  }

  if (resolvedLocation) {
    extractedCity = resolvedLocation.city || extractedCity;
    extractedLocality = resolvedLocation.locality || extractedLocality;
  }

  let intent = {
    rawQuery,
    normalizedQuery,
    extractedSkill,
    extractedCity,
    extractedLocality,
    extractedUrgency,
    extractedBudgetMin,
    extractedBudgetMax,
    extractedShiftType,
    extractedTimeOfDay,
    confidence: 0,
    sourceUserId: sourceUserId || null,
    ...(resolvedLocation ? {
      locationData: {
        label: resolvedLocation.label,
        city: resolvedLocation.city,
        locality: resolvedLocation.locality,
        state: resolvedLocation.state,
        country: resolvedLocation.country,
        latitude: resolvedLocation.latitude,
        longitude: resolvedLocation.longitude,
        types: resolvedLocation.types || [],
      }
    } : {}),
  };

  intent.confidence = calcConfidence(intent);

  if (allowAIFallback && intent.confidence < 0.5 && rawQuery && await isAISearchInterpretEnabled()) {
    const aiResult = await interpretSearchIntent({ query: rawQuery }, { userId: sourceUserId, role: sourceUserRole || 'recruiter', locationContext });
    const aiOutput = aiResult?.output || {};
    if (aiOutput && typeof aiOutput === 'object') {
      intent = {
        ...intent,
        extractedSkill: intent.extractedSkill || aiOutput.extractedSkill || '',
        extractedCity: intent.extractedCity || aiOutput.extractedCity || '',
        extractedLocality: intent.extractedLocality || aiOutput.extractedLocality || '',
        extractedUrgency: intent.extractedUrgency || aiOutput.extractedUrgency || 'normal',
        extractedBudgetMin: intent.extractedBudgetMin ?? aiOutput.extractedBudgetMin ?? null,
        extractedBudgetMax: intent.extractedBudgetMax ?? aiOutput.extractedBudgetMax ?? null,
        extractedShiftType: intent.extractedShiftType || aiOutput.extractedShiftType || '',
        extractedTimeOfDay: intent.extractedTimeOfDay || aiOutput.extractedTimeOfDay || '',
      };
      intent.confidence = Math.max(intent.confidence, Number(aiOutput.confidence || 0.55));
    }
  }

  const intentDoc = await JobSearchIntent.create(intent);

  return {
    intentId: intentDoc._id,
    ...intent,
    suggestedFilters: buildSuggestedFilters(intent),
  };
}

module.exports = {
  normalizeForSearch,
  parseSearchIntent,
};
