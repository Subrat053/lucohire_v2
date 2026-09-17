const {
  generateProfileSuggestion,
  generatePricingSuggestion,
} = require('../../../services/aiAssistService');

function tokenizeSkills(input = '') {
  const normalized = String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9,\s-]/g, ' ')
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  const known = new Set([
    'plumber',
    'electrician',
    'carpenter',
    'painter',
    'driver',
    'cook',
    'maid',
    'mechanic',
    'welder',
    'beautician',
    'tutor',
    'ac',
    'technician',
  ]);

  const skills = [];
  normalized.forEach((token) => {
    if (known.has(token)) skills.push(token);
  });

  return Array.from(new Set(skills)).map((s) => s.replace(/^\w/, (c) => c.toUpperCase()));
}

async function buildProviderProfileFromFreeText({ input, existingSkills = [], userMeta = {} } = {}) {
  const result = await generateProfileSuggestion(
    {
      freeText: String(input || '').trim(),
      existingSkills,
    },
    {
      userId: userMeta.userId,
      role: userMeta.role || 'provider',
    }
  );

  return {
    ...result.output,
    aiStatus: result.status,
    model: result.model,
  };
}

async function improveProviderDescription({ input, existingSkills = [], userMeta = {} } = {}) {
  const profile = await buildProviderProfileFromFreeText({ input, existingSkills, userMeta });

  const cleanDescription = String(profile.description || '')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    original: String(input || '').trim(),
    improved: cleanDescription,
    headline: profile.headline || '',
    aiStatus: profile.aiStatus,
    model: profile.model,
  };
}

async function suggestSkillsAndTags({ input, existingSkills = [], userMeta = {} } = {}) {
  const profile = await buildProviderProfileFromFreeText({ input, existingSkills, userMeta });
  const heuristicSkills = tokenizeSkills(input);
  const mergedSkills = Array.from(new Set([...(profile.suggestedSkills || []), ...heuristicSkills]));

  const tags = mergedSkills.map((skill) => `${String(skill).toLowerCase().replace(/\s+/g, '_')}_service`);

  return {
    skills: mergedSkills,
    tags,
    aiStatus: profile.aiStatus,
    model: profile.model,
  };
}

async function suggestPricingRange({ input, category = '', city = '', userMeta = {} } = {}) {
  const marketStats = {
    avgMin: 500,
    avgMax: 2500,
    avg: 1500,
    sampleSize: 0,
  };

  const result = await generatePricingSuggestion(
    {
      skill: category || '',
      city: city || '',
      marketStats,
      contextInput: String(input || ''),
    },
    {
      userId: userMeta.userId,
      role: userMeta.role || 'provider',
    }
  );

  return {
    min: Number(result.output.min || 0),
    max: Number(result.output.max || 0),
    avg: Number(result.output.avg || 0),
    reasoning: result.output.reasoning || '',
    confidence: Number(result.output.confidence || 0),
    aiStatus: result.status,
    model: result.model,
  };
}

async function generateStructuredProfileData({ input, category = '', city = '', existingSkills = [], userMeta = {} } = {}) {
  const [profile, skillsAndTags, pricing] = await Promise.all([
    buildProviderProfileFromFreeText({ input, existingSkills, userMeta }),
    suggestSkillsAndTags({ input, existingSkills, userMeta }),
    suggestPricingRange({ input, category, city, userMeta }),
  ]);

  return {
    headline: profile.headline || '',
    description: profile.description || '',
    suggestedSkills: skillsAndTags.skills,
    tags: skillsAndTags.tags,
    suggestedPriceRange: {
      min: pricing.min,
      max: pricing.max,
      avg: pricing.avg,
      confidence: pricing.confidence,
      reasoning: pricing.reasoning,
    },
    missingFields: profile.missingFields || [],
    aiStatus: profile.aiStatus,
    model: profile.model,
  };
}

module.exports = {
  buildProviderProfileFromFreeText,
  improveProviderDescription,
  suggestSkillsAndTags,
  suggestPricingRange,
  generateStructuredProfileData,
};
