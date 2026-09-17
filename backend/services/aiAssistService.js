const {
  buildProviderProfile,
  generateJobDescription: generateClaudeJobDescription,
  suggestPricing,
  generateDashboardInsights,
  chatAssistant,
  fraudReview,
  boostSuggestionText,
  runSearchIntentAI,
} = require('./ai/anthropicService');
const { CITY_DICTIONARY } = require('../utils/locationDictionary');
const { extractSearchFilters } = require('./openaiSearchService');

const normalizeText = (value) => String(value || '').trim();
const normalizeForSearch = (value) => normalizeText(value)
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim();

function fallbackProfileSuggestion({ freeText, existingSkills = [] }) {
  const text = normalizeText(freeText);
  const yearsMatch = text.match(/(\d+)\s*(year|years|yr|yrs|saal)/i);
  const years = yearsMatch ? Number(yearsMatch[1]) : null;

  const knownSkills = [
    'electrician',
    'plumber',
    'carpenter',
    'painter',
    'driver',
    'cook',
    'maid',
    'welder',
    'ac technician',
    'mechanic',
    'beautician',
    'tutor',
  ];

  const detected = knownSkills.filter((skill) => text.toLowerCase().includes(skill));
  const skills = [...new Set([...existingSkills, ...detected.map((s) => s.replace(/\b\w/g, (ch) => ch.toUpperCase()))])];

  const headlineBase = skills[0] || 'Skilled Service Provider';
  const headline = years ? `${headlineBase} with ${years}+ years experience` : `${headlineBase}`;
  const description = text
    ? `Reliable ${headlineBase.toLowerCase()} available for quality work. ${text}`
    : `Reliable ${headlineBase.toLowerCase()} available for quality work and timely service.`;

  return {
    headline,
    description,
    suggestedSkills: skills,
    suggestedPriceRange: { min: 300, max: 1200, confidence: 0.4 },
    missingFields: ['city', 'languages', 'portfolioLinks'],
  };
}

function fallbackJobDescription({ prompt, skill, city, budgetMin, budgetMax, budgetType }) {
  const cleanedPrompt = normalizeText(prompt);
  const info = extractInfoFromText(cleanedPrompt);

  const extractedSkill = normalizeText(skill) || info.skills[0];
  const resolvedSkill = extractedSkill || 'service provider';
  const resolvedCity = normalizeText(city) || info.city;
  const title = cleanedPrompt
    ? (cleanedPrompt.length > 60 ? cleanedPrompt.slice(0, 57) + '...' : cleanedPrompt)
    : `${resolvedSkill[0].toUpperCase()}${resolvedSkill.slice(1)} required${resolvedCity ? ` in ${resolvedCity}` : ''}`;

  const duties = [
    `Perform ${resolvedSkill} work as per agreed quality standards`,
    'Follow safety and hygiene practices during service',
    'Coordinate timings and updates with the recruiter',
  ];

  const bMin = Number(budgetMin || info.budget.min || 0);
  const bMax = Number(budgetMax || info.budget.max || 0);
  const bType = budgetType || info.budget.type || 'negotiable';

  const budgetHint = bMin || bMax
    ? `Budget range: ₹${bMin} - ₹${bMax} (${bType}).`
    : 'Budget is negotiable based on experience and scope.';

  return {
    title,
    fullDescription: `${title}. ${budgetHint} Candidate should be punctual, professional, and responsive.`,
    duties,
    skills: extractedSkill ? [extractedSkill] : [],
    city: resolvedCity,
    location: {
      city: resolvedCity,
      state: '',
      country: 'India',
      formattedAddress: resolvedCity ? `${resolvedCity}, India` : '',
      source: 'fallback_extraction'
    },
    budget: {
      min: bMin,
      max: bMax,
      currency: 'INR',
      type: bType
    },
    pricing: info.pricing || (bMin ? `₹${bMin}${bMax > bMin ? ` - ₹${bMax}` : ''}` : ''),
    urgencyHints: ['normal'],
  };
}


function fallbackSearchIntent({ query }) {
  return {
    extractedSkill: '',
    extractedCity: '',
    extractedLocality: '',
    extractedUrgency: '',
    extractedBudgetMin: null,
    extractedBudgetMax: null,
    extractedShiftType: '',
    extractedTimeOfDay: '',
    confidence: 0.2,
    normalizedQuery: normalizeText(query).toLowerCase(),
  };
}

const SEARCH_SKILL_MAPPINGS = [
  { canonical: 'Cleaning / Sweeper', aliases: ['sweeper', 'safai', 'cleaning', 'cleaner', 'housekeeping', 'house keeping', 'jhaadu', 'jhadu', 'pocha', 'maid cleaning'] },
  { canonical: 'Carpenter', aliases: ['carpenter', 'carpainter', 'carpentor', 'wood work', 'woodwork', 'furniture work', 'badhai'] },
  { canonical: 'Electrician', aliases: ['electrician', 'electritian', 'electrcian', 'electric', 'wiring', 'wireman', 'bijli'] },
  { canonical: 'Plumber', aliases: ['plumber', 'plumbing', 'plumbr', 'pipe fitting', 'pipeline', 'nal ka kaam'] },
  { canonical: 'Maid / House Help', aliases: ['maid', 'househelp', 'house help', 'domestic help', 'helper', 'ghar ka kaam'] },
  { canonical: 'Painter', aliases: ['painter', 'painting', 'paint', 'rang ka kaam'] },
  { canonical: 'Driver', aliases: ['driver', 'driving', 'gaadi chalata', 'chauffeur'] },
  { canonical: 'Cook', aliases: ['cook', 'cooking', 'chef', 'khana banane wala', 'bawarchi'] },
  { canonical: 'AC Technician', aliases: ['ac technician', 'ac repair', 'ac mechanic', 'air conditioner', 'fridge repair', 'cooling repair'] },
];

const SEARCH_CITY_ALIASES = CITY_DICTIONARY
  .flatMap((entry) => entry.aliases.map((alias) => ({ city: entry.city, alias: normalizeForSearch(alias) })))
  .sort((a, b) => b.alias.length - a.alias.length);

function detectSearchSkill(normalizedText) {
  for (const mapping of SEARCH_SKILL_MAPPINGS) {
    for (const alias of mapping.aliases) {
      const safeAlias = normalizeForSearch(alias).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rx = new RegExp(`(?:^|\\b)${safeAlias}(?:\\b|$)`, 'i');
      if (rx.test(normalizedText)) {
        return mapping.canonical;
      }
    }
  }

  return '';
}

function detectSearchCity(normalizedText) {
  for (const item of SEARCH_CITY_ALIASES) {
    const safeAlias = item.alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const contextual = new RegExp(`(?:\\b${safeAlias}\\b\\s*(?:me|mein|mai|main|in|near|around|from|at)\\b)|(?:\\b(?:in|near|around|from|at)\\s+${safeAlias}\\b)`, 'i');
    const generic = new RegExp(`(?:^|\\b)${safeAlias}(?:\\b|$)`, 'i');

    if (contextual.test(normalizedText) || generic.test(normalizedText)) {
      return item.city;
    }
  }

  return '';
}

function extractInfoFromText(text) {
  const normalized = text.toLowerCase();
  const result = {
    budget: { min: 0, max: 0, currency: 'INR', type: 'negotiable' },
    skills: [],
    city: '',
    pricing: ''
  };

  // 1. Budget extraction
  const budgetMatch = text.match(/(?:budget|price|salary|rate|pay|cost|payment|fixed|₹|rs\.?|inr)\s*(?:is|:|=)?\s*(?:rs\.?|₹|inr)?\s*(\d+)(?:\s*(?:-|to)\s*(\d+))?/i);
  if (budgetMatch) {
    result.budget.min = parseInt(budgetMatch[1], 10);
    result.budget.max = budgetMatch[2] ? parseInt(budgetMatch[2], 10) : result.budget.min;

    if (normalized.includes('fixed')) result.budget.type = 'fixed';
    else if (normalized.includes('hour')) result.budget.type = 'hourly';
    else if (normalized.includes('month')) result.budget.type = 'monthly';
    else if (normalized.includes('day')) result.budget.type = 'daily';

    result.pricing = `₹${result.budget.min}${result.budget.max > result.budget.min ? ` - ₹${result.budget.max}` : ''}${result.budget.type !== 'negotiable' ? ` per ${result.budget.type}` : ''}`;
  }

  // 2. Skill detection
  for (const mapping of SEARCH_SKILL_MAPPINGS) {
    for (const alias of mapping.aliases) {
      const safeAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rx = new RegExp(`(?:^|\\b)${safeAlias}(?:\\b|$)`, 'i');
      if (rx.test(normalized)) {
        result.skills.push(mapping.canonical);
        break;
      }
    }
  }

  // 3. City detection
  for (const item of SEARCH_CITY_ALIASES) {
    const safeAlias = item.alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp(`(?:^|\\b)${safeAlias}(?:\\b|$)`, 'i');
    if (rx.test(normalized)) {
      result.city = item.city;
      break;
    }
  }

  return result;
}


async function interpretSearchIntent(input = {}, meta = {}) {
  const query = normalizeText(input.query);
  const fallbackOutput = fallbackSearchIntent({ query });

  const normalized = normalizeForSearch(query);
  const detectedSkill = detectSearchSkill(normalized);
  const detectedCity = detectSearchCity(normalized);

  // If deterministic rules find both, skip LLM call to save token/latency
  if (detectedSkill && detectedCity) {
    return {
      status: 'success',
      model: 'rule-fallback',
      output: {
        ...fallbackOutput,
        extractedSkill: detectedSkill,
        extractedCity: detectedCity,
        confidence: 0.85,
        normalizedQuery: normalized,
      },
    };
  }

  try {
    const aiOutput = await extractSearchFilters(query);
    return {
      status: 'success',
      model: 'openai-gpt',
      output: {
        ...fallbackOutput,
        extractedSkill: aiOutput.skill || detectedSkill || '',
        extractedCity: aiOutput.location || detectedCity || '',
        confidence: aiOutput.skill || aiOutput.location ? 0.85 : 0.2,
        normalizedQuery: normalized,
      },
    };
  } catch (error) {
    console.error("OpenAI intent extraction error:", error.message);
    return {
      status: 'fallback',
      model: 'rule-fallback',
      output: {
        ...fallbackOutput,
        extractedSkill: detectedSkill,
        extractedCity: detectedCity,
        confidence: detectedSkill || detectedCity ? 0.55 : 0.2,
        normalizedQuery: normalized,
      },
    };
  }
}

async function generateProfileSuggestion(input = {}, meta = {}) {
  const ai = await buildProviderProfile({
    freeText: normalizeText(input.freeText),
    existingSkills: Array.isArray(input.existingSkills) ? input.existingSkills : [],
    userMeta: { userId: meta.userId, role: meta.role || 'provider' },
  });

  const output = ai.output || {};
  if (ai.status === 'success') {
    return {
      output: {
        headline: output.category || (output.skills && output.skills[0]) || 'Service Provider',
        description: output.description || '',
        suggestedSkills: Array.isArray(output.skills) ? output.skills : [],
        suggestedPriceRange: {
          min: Number(output.suggested_pricing_range?.min || 0),
          max: Number(output.suggested_pricing_range?.max || 0),
          confidence: Number(output.confidence || 0.6),
        },
        missingFields: [],
      },
      status: ai.status,
      model: ai.model,
    };
  }

  const fallback = fallbackProfileSuggestion(input);
  return {
    output: fallback,
    status: 'fallback',
    model: 'rule-fallback',
  };
}

async function generateJobDescription(input = {}, meta = {}) {
  const ai = await generateClaudeJobDescription({
    prompt: normalizeText(input.prompt),
    skill: input.skill || '',
    city: input.city || '',
    budgetMin: Number(input.budgetMin || 0),
    budgetMax: Number(input.budgetMax || 0),
    budgetType: input.budgetType || 'negotiable',
    userMeta: { userId: meta.userId, role: meta.role || 'recruiter' },
  });

  if (ai.status === 'success') {
    const out = ai.output || {};
    // Fallback extraction for missing fields in AI response
    const info = extractInfoFromText(normalizeText(input.prompt));

    return {
      output: {
        title: out.title || '',
        fullDescription: out.description || '',
        duties: Array.isArray(out.duties) ? out.duties : [],
        skills: (Array.isArray(out.skills) && out.skills.length > 0) ? out.skills : info.skills,
        city: out.city || info.city || '',
        location: out.location || {
          city: out.city || info.city || '',
          state: out.state || '',
          country: out.country || 'India',
          formattedAddress: out.formattedAddress || (out.city || info.city ? `${out.city || info.city}, India` : ''),
          source: 'ai_extracted',
        },
        budget: {
          min: Number(out.budget?.min || out.salary_range?.min || info.budget.min || 0),
          max: Number(out.budget?.max || out.salary_range?.max || info.budget.max || 0),
          currency: out.budget?.currency || 'INR',
          type: out.budget?.type || out.budgetType || info.budget.type || 'negotiable',
        },
        pricing: out.pricing || info.pricing || '',
        experience: out.experience || '',
        jobType: out.jobType || '',
        category: out.category || '',
        urgencyHints: Array.isArray(out.urgency_hints) ? out.urgency_hints : (Array.isArray(out.urgencyHints) ? out.urgencyHints : ['normal']),
        confidence: Number(out.confidence || 0.65),
      },
      status: ai.status,
      model: ai.model,
    };
  }



  const fallback = fallbackJobDescription(input);
  return {
    output: fallback,
    status: 'fallback',
    model: 'rule-fallback',
  };
}

async function generatePricingSuggestion(input = {}, meta = {}) {
  const ai = await suggestPricing({
    ...input,
    userMeta: { userId: meta.userId, role: meta.role || 'provider' },
  });

  if (ai.status === 'success') {
    return {
      output: {
        min: Number(ai.output.min || 0),
        max: Number(ai.output.max || 0),
        avg: Number(ai.output.avg || 0),
        reasoning: ai.output.reasoning || '',
        confidence: Number(ai.output.confidence || 0.6),
      },
      status: ai.status,
      model: ai.model,
    };
  }

  return {
    output: {
      min: Number(input.marketStats?.avgMin || 500),
      max: Number(input.marketStats?.avgMax || 2500),
      avg: Number(input.marketStats?.avg || 1500),
      reasoning: 'Market fallback based on historical city/skill range.',
      confidence: 0.4,
    },
    status: 'fallback',
    model: 'rule-fallback',
  };
}

async function generateProviderInsights(input = {}, meta = {}) {
  const ai = await generateDashboardInsights({
    ...input,
    userMeta: { userId: meta.userId, role: meta.role || 'provider' },
  });

  return {
    output: {
      tips: Array.isArray(ai.output?.tips) ? ai.output.tips : [],
      summary: ai.output?.summary || '',
      confidence: Number(ai.output?.confidence || 0.4),
    },
    status: ai.status,
    model: ai.model,
  };
}

async function runRoleAwareChat(input = {}, meta = {}) {
  const ai = await chatAssistant({
    ...input,
    userMeta: { userId: meta.userId, role: meta.role || 'recruiter' },
  });

  return {
    output: {
      reply: ai.output?.reply || '',
      followUpQuestions: Array.isArray(ai.output?.follow_up_questions) ? ai.output.follow_up_questions : [],
      confidence: Number(ai.output?.confidence || 0.3),
    },
    status: ai.status,
    model: ai.model,
  };
}

async function runFraudClusterReview(input = {}, meta = {}) {
  const ai = await fraudReview({
    ...input,
    userMeta: { userId: meta.userId, role: meta.role || 'system' },
  });

  return {
    output: ai.output,
    status: ai.status,
    model: ai.model,
  };
}

async function generateBoostMessage(input = {}, meta = {}) {
  const ai = await boostSuggestionText({
    ...input,
    userMeta: { userId: meta.userId, role: meta.role || 'system' },
  });

  return {
    output: {
      message: ai.output?.message || 'Demand high hai. Boost karke visibility badhao.',
      rationale: ai.output?.rationale || '',
      confidence: Number(ai.output?.confidence || 0.4),
    },
    status: ai.status,
    model: ai.model,
  };
}

module.exports = {
  interpretSearchIntent,
  generateProfileSuggestion,
  generateJobDescription,
  generatePricingSuggestion,
  generateProviderInsights,
  runRoleAwareChat,
  runFraudClusterReview,
  generateBoostMessage,
};
