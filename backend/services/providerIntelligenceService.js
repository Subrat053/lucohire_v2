const prisma = require('../config/prisma');
const { withLegacyId } = require('../utils/prismaResponse');

const TIER_SKILLS = {
  'unskilled': [
    'Labour',
    'Helper Plumber',
    'Helper Electrician',
    'Construction Helper',
    'Cleaning Helper',
    'Painter Helper',
    'Carpenter Helper',
    'Loader',
    'Delivery Helper',
    'Kitchen Helper',
    'House helper / Maid',
    'Cleaning staff',
    'Dishwasher',
    'Babysitting assistant',
    'Elder care helper',
    'Pet helper',
    'Delivery boy',
    'Courier runner',
    'Warehouse loader',
    'Packing staff',
    'Mover / Shifter',
    'Site labour',
    'Brick carrier',
    'Road worker',
    'Factory worker',
    'Assembly worker',
    'Sorting staff',
    'Helper',
    'Shop helper',
    'Store assistant',
    'Stock handler',
    'Sales helper',
    'Office boy',
    'Tea boy',
    'Cleaner',
  ],
  'semi-skilled': [
    'Plumber',
    'AC Mechanic',
    'Electrician',
    'Carpenter',
    'Painter',
    'Mason',
    'Driver',
    'Cook',
    'Tailor',
    'Machine Operator',
    'Technician',
    'AC technician',
    'Welder',
    'Mechanic',
    'CCTV installer',
    'Driver (Car)',
    'Truck driver',
    'Bus driver',
    'Forklift operator',
    'Chef assistant',
    'Waiter',
    'Bartender',
    'Beautician',
    'Hair stylist',
    'Nail artist',
    'Massage therapist',
    'Telecaller',
    'Customer support',
    'Field sales executive',
    'Collection executive',
    'Nurse assistant',
    'Caretaker',
    'Lab technician',
  ],
  'skilled': [
    'Web Developer',
    'App Developer',
    'Software developer',
    'Software engineer',
    'AI specialist',
    'AI Developer',
    'Data analyst',
    'UI/UX designer',
    'Graphic Designer',
    'Video Editor',
    'SEO Expert',
    'Digital Marketer',
    'Chartered Accountant',
    'Accountant',
    'Tax consultant',
    'Lawyer',
    'Legal advisor',
    'Civil engineer',
    'Mechanical engineer',
    'Electrical engineer',
    'Architect',
    'Interior Designer',
    'School teacher',
    'Online tutor',
    'Coding teacher',
    'Music teacher',
    'Language trainer',
    'Doctor',
    'Physiotherapist',
    'Therapist',
    'Psychologist',
    'Dietician',
    'HR manager',
    'Project Manager',
    'Operations manager',
    'Business consultant',
    'Consultant',
    'Virtual assistant',
    'Remote developer',
    'Remote designer',
    'Remote customer support',
    'Freelance writer',
    'Content Writer',
    'Remote video editor',
    'Cyber Security Expert',
    'Senior Electrician',
  ],
};

const SKILL_ALIASES = {
  'ac technician': { skillLevel: 'semi-skilled', name: 'AC Mechanic' },
  'ac mechanic': { skillLevel: 'semi-skilled', name: 'AC Mechanic' },
  'semi skilled': { skillLevel: 'semi-skilled' },
  'semi_skilled': { skillLevel: 'semi-skilled' },
  'helper plumber': { skillLevel: 'unskilled', name: 'Helper Plumber' },
  'helper electrician': { skillLevel: 'unskilled', name: 'Helper Electrician' },
  'construction helper': { skillLevel: 'unskilled', name: 'Construction Helper' },
  'cleaning helper': { skillLevel: 'unskilled', name: 'Cleaning Helper' },
  'painter helper': { skillLevel: 'unskilled', name: 'Painter Helper' },
  'carpenter helper': { skillLevel: 'unskilled', name: 'Carpenter Helper' },
  'delivery helper': { skillLevel: 'unskilled', name: 'Delivery Helper' },
  'kitchen helper': { skillLevel: 'unskilled', name: 'Kitchen Helper' },
  'ui/ux': { skillLevel: 'skilled', name: 'UI/UX designer' },
  'ui/ux designer': { skillLevel: 'skilled', name: 'UI/UX designer' },
  'ui ux': { skillLevel: 'skilled', name: 'UI/UX designer' },
  'figma': { skillLevel: 'skilled', name: 'UI/UX designer' },
  'design': { skillLevel: 'skilled', name: 'UI/UX designer' },
  'designer': { skillLevel: 'skilled', name: 'UI/UX designer' },
  'graphic designer': { skillLevel: 'skilled', name: 'Graphic Designer' },
  'software developer': { skillLevel: 'skilled', name: 'Software developer' },
  'developer': { skillLevel: 'skilled', name: 'Software developer' },
  'coder': { skillLevel: 'skilled', name: 'Software developer' },
  'programmer': { skillLevel: 'skilled', name: 'Software developer' },
  'accountant': { skillLevel: 'skilled', name: 'Accountant' },
  'teacher': { skillLevel: 'skilled', name: 'School teacher' },
  'tutor': { skillLevel: 'skilled', name: 'Online tutor' },
  'doctor': { skillLevel: 'skilled', name: 'Doctor' },
};

const EXP_MULTIPLIERS = {
  fresher: 0.8,
  '0-1 years': 0.8,
  '1-3 years': 1.0,
  '3-5 years': 1.3,
  '5+ years': 1.6,
  '5-10 years': 1.6,
  '10-15 years': 1.8,
  '15-20 years': 2.0,
  '20-30 years': 2.2,
  '30+ years': 2.5,
};

const SKILL_MULTIPLIERS = {
  'unskilled': 0.65,
  'semi-skilled': 1.0,
  'skilled': 1.7,
};

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeKey(value) {
  return normalizeText(value).toLowerCase().replace(/[_\s]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeSkillLevel(value) {
  const normalized = normalizeKey(value);
  if (normalized === 'semi skilled' || normalized === 'semi-skilled' || normalized === 'semi skilled') {
    return 'semi-skilled';
  }
  if (normalized === 'skilled') return 'skilled';
  return 'unskilled';
}

function canonicalizeSpeciality(speciality) {
  const raw = typeof speciality === 'object' ? (speciality.name || speciality.slug || speciality.specialityId || '') : speciality;
  const normalized = normalizeKey(raw);
  if (!normalized) return { name: '', slug: '', skillLevel: 'unskilled' };

  const alias = SKILL_ALIASES[normalized];
  if (alias) {
    return {
      name: alias.name || raw,
      slug: normalizeText(alias.name || raw).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
      skillLevel: normalizeSkillLevel(alias.skillLevel || 'unskilled'),
    };
  }

  for (const [skillLevel, values] of Object.entries(TIER_SKILLS)) {
    const found = values.find((item) => normalizeKey(item) === normalized);
    if (found) {
      return {
        name: found,
        slug: normalizeText(found).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
        skillLevel,
      };
    }
  }

  return {
    name: normalizeText(raw),
    slug: normalizeText(raw).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
    skillLevel: normalizeSkillLevel(typeof speciality === 'object' ? speciality.skillLevel : 'unskilled'),
  };
}

function filterSpecialitiesBySkill(skillLevel) {
  return [...(TIER_SKILLS[normalizeSkillLevel(skillLevel)] || [])];
}

function validateSpecialitySkillMatch(skillLevel, speciality) {
  const normalizedLevel = normalizeSkillLevel(skillLevel);
  const canonical = canonicalizeSpeciality(speciality);
  const allowed = filterSpecialitiesBySkill(normalizedLevel).map((item) => normalizeKey(item));

  if (!canonical.name) return false;
  return allowed.includes(normalizeKey(canonical.name));
}

function classifyJobMobility(speciality, skillLevel) {
  const canonical = canonicalizeSpeciality(speciality);
  const name = normalizeKey(canonical.name);
  const level = normalizeSkillLevel(skillLevel || canonical.skillLevel);

  const localJobs = new Set([
    'labour', 'helper plumber', 'helper electrician', 'plumber', 'ac mechanic', 'electrician',
    'carpenter', 'painter', 'mason', 'cleaner', 'cook', 'driver', 'security guard',
    'delivery boy', 'delivery helper', 'driver (car)', 'courier runner', 'warehouse loader', 'packing staff', 'mover / shifter'
  ]);
  const regionalJobs = new Set([
    'technician', 'machine operator', 'senior electrician', 'interior work', 'project supervisor',
  ]);
  const remoteJobs = new Set([
    'web developer', 'app developer', 'digital marketer', 'seo expert', 'graphic designer',
    'video editor', 'content writer', 'ai developer', 'cyber security expert', 'consultant',
  ]);

  if (localJobs.has(name)) return 'local';
  if (remoteJobs.has(name) || level === 'skilled') return 'remote/global';
  if (regionalJobs.has(name)) return 'regional';
  if (level === 'unskilled' || level === 'semi-skilled') return 'local';
  return 'local';
}

function calculateDistanceKm(lat1, lng1, lat2, lng2) {
  const toRad = (value) => (Number(value) * Math.PI) / 180;
  const aLat = Number(lat1);
  const aLng = Number(lng1);
  const bLat = Number(lat2);
  const bLng = Number(lng2);

  if (![aLat, aLng, bLat, bLng].every(Number.isFinite)) return null;

  const R = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const c = 2 * Math.atan2(
    Math.sqrt(sinLat * sinLat + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * sinLng * sinLng),
    Math.sqrt(1 - (sinLat * sinLat + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * sinLng * sinLng)),
  );
  return Number((R * c).toFixed(2));
}

function getRadiusExpansionPlan(mobilityType) {
  if (mobilityType === 'regional') {
    return [50, 100, 200, 'same-state', 'nearby-states'];
  }
  if (mobilityType === 'remote/global') {
    return ['local', 'national', 'remote', 'global'];
  }
  return [50, 100, 200, 'same-state', 'nearby-states'];
}

async function resolveGooglePlace(input) {
  const { searchPlaces, getPlaceDetails } = require('./googlePlacesService');
  const text = typeof input === 'string' ? input : normalizeText(input?.inputText || input?.formattedAddress || input?.name || '');
  const explicitPlaceId = typeof input === 'object' ? normalizeText(input.googlePlaceId || input.placeId) : '';

  try {
    if (explicitPlaceId) {
      try {
        const details = await getPlaceDetails(explicitPlaceId);
        if (details) return normalizeGooglePlace(details, text);
      } catch (err) {
        console.warn(`[resolveGooglePlace] Failed to get place details for ID ${explicitPlaceId}:`, err.message);
      }
    }

    if (text) {
      let suggestions = [];
      try {
        suggestions = await searchPlaces(text);
      } catch (err) {
        console.warn(`[resolveGooglePlace] searchPlaces failed for text "${text}":`, err.message);
      }
      if (Array.isArray(suggestions) && suggestions.length > 0) {
        try {
          const details = await getPlaceDetails(suggestions[0].placeId || suggestions[0].place_id);
          if (details) return normalizeGooglePlace(details, text);
        } catch (err) {
          console.warn('[resolveGooglePlace] Failed to get place details for suggestion:', err.message);
        }
      }
    }
  } catch (globalErr) {
    console.error('[resolveGooglePlace] Global unexpected error:', globalErr.message);
  }

  // Graceful fallback: if Google Places lookup fails/times out, but client provided coordinates
  if (input && typeof input === 'object') {
    const lat = Number(input.lat ?? input.latitude ?? null);
    const lng = Number(input.lng ?? input.longitude ?? null);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const placeId = explicitPlaceId || `fallback-${Date.now()}`;
      const formattedAddress = normalizeText(input.formattedAddress || input.name || input.inputText || '');
      return {
        inputText: normalizeText(input.inputText || formattedAddress),
        googlePlaceId: placeId,
        formattedAddress,
        city: normalizeText(input.city || input.locality || input.name || formattedAddress.split(',')[0] || ''),
        state: normalizeText(input.state || input.administrativeAreaLevel1 || ''),
        country: normalizeText(input.country || input.countryCode || ''),
        locality: normalizeText(input.locality || input.sublocality || input.neighborhood || input.name || ''),
        postalCode: normalizeText(input.postalCode || input.postal_code || ''),
        lat,
        lng,
        viewport: input.viewport || null,
        source: input.source || 'client_fallback',
      };
    }
  }

  return null;
}

function normalizeGooglePlace(place, inputText = '') {
  if (!place) return null;
  const placeId = normalizeText(place.googlePlaceId || place.placeId || place.place_id || '');
  const formattedAddress = normalizeText(place.formattedAddress || place.formatted_address || place.address || place.name || inputText);
  const lat = Number(place.lat ?? place.latitude ?? place.geometry?.location?.lat ?? null);
  const lng = Number(place.lng ?? place.longitude ?? place.geometry?.location?.lng ?? null);

  return {
    inputText: normalizeText(inputText || formattedAddress),
    googlePlaceId: placeId,
    formattedAddress,
    city: normalizeText(place.city || place.locality || place.name || formattedAddress.split(',')[0] || ''),
    state: normalizeText(place.state || place.administrativeAreaLevel1 || ''),
    country: normalizeText(place.country || place.countryCode || ''),
    locality: normalizeText(place.locality || place.sublocality || place.neighborhood || place.name || ''),
    postalCode: normalizeText(place.postalCode || place.postal_code || ''),
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    viewport: place.viewport || place.bounds || null,
    source: 'google_places',
  };
}

function mergeUniqueLocations(existing = [], incoming = []) {
  const merged = [];
  const seen = new Set();

  [...existing, ...incoming].forEach((item) => {
    if (!item) return;
    const normalized = normalizeGooglePlace(item, item.inputText || item.formattedAddress || item.name || '');
    if (!normalized) return;
    const fallbackKey = [normalized.city, normalized.state, normalized.country].map(normalizeKey).join('|');
    const key = normalized.googlePlaceId || fallbackKey;
    if (!key || seen.has(key)) return;
    seen.add(key);
    merged.push(normalized);
  });

  return merged;
}

function mergeUniqueSpecialities(existing = [], incoming = []) {
  const merged = [];
  const seen = new Set();

  [...existing, ...incoming].forEach((item) => {
    const canonical = canonicalizeSpeciality(item);
    if (!canonical.name) return;
    const key = `${normalizeKey(canonical.slug)}|${normalizeSkillLevel(canonical.skillLevel)}`;
    if (seen.has(key)) return;
    seen.add(key);
    merged.push({
      specialityId: item?.specialityId || item?._id || canonical.slug,
      name: canonical.name,
      slug: canonical.slug,
      skillLevel: normalizeSkillLevel(item?.skillLevel || canonical.skillLevel),
      mobilityType: item?.mobilityType || classifyJobMobility(canonical.name, canonical.skillLevel),
    });
  });

  return merged;
}

function calculateAISuggestedPricing(context = {}) {
  const skillLevel = normalizeSkillLevel(context.skillLevel);
  const speciality = canonicalizeSpeciality(context.speciality || context.selectedSpeciality || context.selectedSpecialities?.[0] || '');
  const experience = normalizeKey(context.experience || '');
  const baseSpecialityPrice = Number(context.baseSpecialityPrice || (skillLevel === 'skilled' ? 1200 : skillLevel === 'semi-skilled' ? 500 : 250));
  const skillMultiplier = SKILL_MULTIPLIERS[skillLevel] || 1;
  const experienceMultiplier = EXP_MULTIPLIERS[experience] || EXP_MULTIPLIERS[normalizeKey(context.experienceLabel || '')] || 1;
  const locationMultiplier = Number(context.locationMultiplier || 1);
  const demandMultiplier = Number(context.demandMultiplier || 1);

  const finalPrice = Math.max(50, baseSpecialityPrice * skillMultiplier * experienceMultiplier * locationMultiplier * demandMultiplier);
  const perDay = Math.round(finalPrice);
  const perHour = Math.round(finalPrice / 8);
  const perMonth = Math.round(finalPrice * 22);

  return {
    pricing: {
      perHour,
      perDay,
      perMonth,
      currency: 'INR',
      confidenceScore: Number(Math.min(0.98, 0.55 + ((skillMultiplier + experienceMultiplier) / 10)).toFixed(2)),
      reason: `Estimated from ${speciality.name || 'selected speciality'}, ${skillLevel} skill level, experience and local demand.`,
    },
    baseSpecialityPrice,
  };
}

function buildEmbeddingText({ skillLevel, specialities = [], locations = [], pricing = [], workMode = '', experience = '', bio = '', tags = [] } = {}) {
  const parts = [];
  if (skillLevel) parts.push(`Provider skill level: ${normalizeSkillLevel(skillLevel)}.`);
  if (Array.isArray(specialities) && specialities.length) {
    parts.push(`Specialities: ${specialities.map((item) => canonicalizeSpeciality(item).name).filter(Boolean).join(', ')}.`);
  }
  if (experience) parts.push(`Experience: ${normalizeText(experience)}.`);
  if (Array.isArray(locations) && locations.length) {
    parts.push(`Locations: ${locations.map((item) => normalizeText(item.formattedAddress || item.city || item.name)).filter(Boolean).join(', ')}.`);
  }
  if (Array.isArray(pricing) && pricing.length) {
    parts.push(`Pricing: ${pricing.map((item) => `${normalizeText(item.specialitySlug || item.specialityId || '')} ${normalizeText(item.perHour || item.perDay || item.perMonth || '')}`).filter(Boolean).join('; ')}.`);
  }
  if (workMode) parts.push(`Work mode: ${normalizeText(workMode)}.`);
  if (bio) parts.push(`Bio: ${normalizeText(bio)}.`);
  if (Array.isArray(tags) && tags.length) parts.push(`Tags: ${tags.map((item) => normalizeText(item)).filter(Boolean).join(', ')}.`);
  return parts.join(' ').trim();
}

function generateProviderEmbedding(provider = {}) {
  return buildEmbeddingText({
    skillLevel: provider.skillLevel || provider.tier,
    specialities: provider.specialities || provider.skills || [],
    locations: provider.locations || [],
    pricing: provider.pricingEntries || provider.pricing || [],
    workMode: provider.workMode || '',
    experience: provider.experience || '',
    bio: provider.description || '',
    tags: provider.tags || [],
  });
}

function generateJobEmbedding(job = {}) {
  return buildEmbeddingText({
    skillLevel: job.requiredSkillLevel || job.skillLevel || '',
    specialities: [job.speciality || job.skill || ''],
    locations: [job.location || {}],
    pricing: job.budget ? [job.budget] : [],
    workMode: job.workMode || '',
    experience: job.requiredExperience || '',
    bio: job.description || '',
    tags: job.tags || [],
  });
}

async function getActivePlan(userId) {
  if (!userId) return null;
  return withLegacyId(await prisma.providerSubscription.findFirst({
    where: {
      providerId: String(userId),
      subscriptionStatus: 'active',
      paymentStatus: 'paid',
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  }));
}

async function getActivePlanBenefits(userId) {
  const subscription = await getActivePlan(userId);
  if (!subscription) {
    return {
      isActive: false,
      mode: 'replace',
      topInCity: { enabled: false, expiresAt: null },
      topInCountry: { enabled: false, expiresAt: null },
      topInLocality: { enabled: false, expiresAt: null },
      multipleSkills: { enabled: false, expiresAt: null, specialityLimit: 1, locationLimit: 1 },
    };
  }

  const benefits = subscription.planBenefits || subscription.customConfig?.planBenefits || subscription.customConfig?.benefits || subscription.benefits || {};
  const now = Date.now();
  const benefitEntry = (name, defaults = {}) => {
    const entry = benefits?.[name] || {};
    const expiresAt = entry.expiresAt ? new Date(entry.expiresAt) : null;
    const enabled = entry.enabled === true && (!expiresAt || expiresAt.getTime() > now);
    return {
      enabled,
      expiresAt,
      ...defaults,
      ...entry,
    };
  };

  const multipleSkills = benefitEntry('multipleSkills', { specialityLimit: Number(subscription.planSnapshot?.maxSkills || 1), locationLimit: Number(subscription.planSnapshot?.maxCities || 1) });
  return {
    isActive: true,
    mode: multipleSkills.enabled ? 'append' : 'replace',
    topInCity: benefitEntry('topInCity'),
    topInCountry: benefitEntry('topInCountry'),
    topInLocality: benefitEntry('topInLocality'),
    multipleSkills,
    raw: subscription,
  };
}

async function isBenefitActive(userId, benefitName) {
  const benefits = await getActivePlanBenefits(userId);
  return Boolean(benefits?.[benefitName]?.enabled);
}

async function getPlanLimits(userId) {
  const benefits = await getActivePlanBenefits(userId);
  const multipleSkills = benefits?.multipleSkills?.enabled;
  return {
    specialityLimit: multipleSkills ? Number(benefits?.multipleSkills?.specialityLimit || 1) : 1,
    locationLimit: multipleSkills ? Number(benefits?.multipleSkills?.locationLimit || 1) : 1,
    canAppend: Boolean(multipleSkills),
  };
}

function applyAISuggestionByPlanMode(userId, suggestion, benefits = null) {
  const planBenefits = benefits || {};
  const mode = planBenefits.mode || (planBenefits.multipleSkills?.enabled ? 'append' : 'replace');
  const limits = {
    specialityLimit: Number(planBenefits.multipleSkills?.specialityLimit || 1),
    locationLimit: Number(planBenefits.multipleSkills?.locationLimit || 1),
  };

  const specialities = mergeUniqueSpecialities(
    mode === 'append' ? (suggestion.existingSpecialities || []) : [],
    suggestion.suggestedSpecialities || [],
  ).slice(0, limits.specialityLimit);

  const locations = mergeUniqueLocations(
    mode === 'append' ? (suggestion.existingLocations || []) : [],
    suggestion.suggestedLocations || [],
  ).slice(0, limits.locationLimit);

  return {
    mode,
    specialities,
    locations,
  };
}

function getMatchingStrategy(job = {}) {
  const workMode = normalizeKey(job.workMode || '');
  const mobilityType = classifyJobMobility(job.speciality || job.skill || '', job.requiredSkillLevel || job.skillLevel || '');

  if (workMode === 'remote') return 'remote/global';
  if (mobilityType === 'local') return 'radius_local';
  if (mobilityType === 'regional') return 'radius_regional';
  if (mobilityType === 'remote/global') return 'opportunity_first';
  return 'radius_local';
}

module.exports = {
  TIER_SKILLS,
  filterSpecialitiesBySkill,
  validateSpecialitySkillMatch,
  classifyJobMobility,
  calculateAISuggestedPricing,
  generateProviderEmbedding,
  generateJobEmbedding,
  mergeUniqueLocations,
  mergeUniqueSpecialities,
  applyAISuggestionByPlanMode,
  calculateDistanceKm,
  getRadiusExpansionPlan,
  getMatchingStrategy,
  getActivePlan,
  getActivePlanBenefits,
  isBenefitActive,
  getPlanLimits,
  resolveGooglePlace,
  normalizeGooglePlace,
  canonicalizeSpeciality,
};
