const asNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const asArray = (value) => (Array.isArray(value) ? value : []);

const firstNonEmpty = (...values) => values.find((value) => typeof value === 'string' && value.trim());

export const extractProvidersList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];

  const candidates = [
    payload.providers,
    payload.combined,
    payload.results,
    payload.data?.providers,
    payload.data,
    payload.items,
    payload.list,
  ];

  const firstList = candidates.find((candidate) => Array.isArray(candidate));
  return firstList || [];
};

export const getProviderId = (provider = {}, fallback = '') => {
  return String(
    provider.id ||
      provider._id ||
      provider.providerId ||
      provider.user?._id ||
      provider.user?.id ||
      fallback
  );
};

export const normalizeProviderData = (provider = {}, index = 0, options = {}) => {
  const isDummy = Boolean(options.isDummy || provider.isDummy);
  const id = getProviderId(provider, `provider-${index + 1}`);

  const name =
    firstNonEmpty(provider.name, provider.user?.name, provider.fullName, provider.displayName) ||
    'Service Provider';

  const skills = asArray(provider.skills).filter(Boolean);
  const services = asArray(provider.services).filter(Boolean);
  const mergedSkills = skills.length > 0 ? skills : services;

  const category =
    firstNonEmpty(provider.category, provider.primarySkill, provider.profession, mergedSkills[0]) ||
    'Professional';

  const image =
    firstNonEmpty(
      provider.image,
      provider.profilePhoto,
      provider.photo,
      provider.avatar,
      provider.user?.avatar,
      provider.user?.profilePhoto
    ) ||
    '';

  const location =
    firstNonEmpty(provider.location, provider.city, provider.location?.city, provider.address?.city) ||
    'Unknown';

  const rating = asNumber(provider.rating ?? provider.avgRating ?? provider.averageRating, 0);
  const totalReviews = asNumber(provider.totalReviews ?? provider.reviewCount ?? provider.reviews, 0);
  
  const cleanPricing = typeof provider.pricing === 'string' 
    ? parseFloat(provider.pricing.replace(/[^\d.]/g, '')) 
    : provider.pricing;

  const ratePerHour = asNumber(
    provider.ratePerHour ??
      provider.hourlyRate ??
      provider.rate ??
      provider.price ??
      cleanPricing,
    0
  );

  const description =
    firstNonEmpty(provider.description, provider.headline, provider.about) ||
    'Experienced service provider available for local work.';

  const experienceValue =
    provider.experience ?? provider.yearsOfExperience ?? provider.experienceYears ?? provider.experienceText;

  let experience = 'N/A';
  if (typeof experienceValue === 'number') {
    experience = `${experienceValue} years`;
  } else if (typeof experienceValue === 'string' && experienceValue.trim()) {
    experience = experienceValue.trim();
  }

  const normalized = {
    id,
    name,
    image,
    category,
    rating,
    location,
    experience,
    description,
    phone: provider.phone || provider.mobile || provider.whatsappNumber || '',
    email: provider.email || provider.user?.email || '',
    skills: mergedSkills,
    services: services.length > 0 ? services : mergedSkills,
    isDummy,

    // Compatibility fields used across existing UI components.
    _id: id,
    user: {
      ...(provider.user || {}),
      _id: provider.user?._id || id,
      name,
      avatar: provider.user?.avatar || image,
      email: provider.user?.email || provider.email || '',
    },
    city: location,
    profilePhoto: image,
    photo: provider.photo || image,
    avgRating: rating,
    averageRating: rating,
    totalReviews,
    headline: provider.headline || description,
    role: provider.role || `${category} • ${experience}`,
    tags: asArray(provider.tags).length > 0 ? asArray(provider.tags) : mergedSkills.slice(0, 3),
    distanceKm: provider.distanceKm ?? provider.distance ?? null,
    tier: provider.tier || 'skilled',
    isVerified: provider.isVerified !== false,
    isAvailable: provider.isAvailable !== false,
    ratePerHour,
    currentPlan: provider.currentPlan || 'free',
    languages: asArray(provider.languages),
    profileViews: asNumber(provider.profileViews, 0),
    portfolioLinks: asArray(provider.portfolioLinks),
    planName: provider.planName || provider.plan?.name || '',
    visibilityLevel: provider.visibilityLevel || '',
    isBoosted: Boolean(provider.isBoosted),
    boostedUntil: provider.boostedUntil || null,
    planBadge: provider.planBadge || '',
    pricing: provider.pricing || '',
    pricingType: provider.pricingType || '',
    whatsappAlerts: provider.whatsappAlerts !== false && provider.user?.whatsappAlerts !== false,
    isWhatsappSameAsMobile: provider.isWhatsappSameAsMobile !== false && provider.user?.isWhatsappSameAsMobile !== false,
  };


  return normalized;
};

export const normalizeProvidersList = (providers = [], options = {}) => {
  return asArray(providers).map((provider, index) => normalizeProviderData(provider, index, options));
};

export const findProviderById = (providers = [], id = '') => {
  const targetId = String(id || '');
  if (!targetId) return null;

  return (
    asArray(providers).find((provider) => {
      const providerId = getProviderId(provider, '');
      return providerId === targetId;
    }) || null
  );
};

export const filterProvidersByCategory = (providers = [], category = '', city = '') => {
  const categoryTerm = String(category || '').toLowerCase().trim();
  const cityTerm = String(city || '').toLowerCase().trim();

  return asArray(providers).filter((provider) => {
    const normalized = normalizeProviderData(provider);

    const categoryMatch =
      !categoryTerm ||
      normalized.category.toLowerCase().includes(categoryTerm) ||
      normalized.skills.some((skill) => String(skill).toLowerCase().includes(categoryTerm)) ||
      normalized.services.some((service) => String(service).toLowerCase().includes(categoryTerm)) ||
      normalized.description.toLowerCase().includes(categoryTerm);

    const cityMatch =
      !cityTerm ||
      normalized.location.toLowerCase().includes(cityTerm) ||
      cityTerm.includes(normalized.location.toLowerCase());

    return categoryMatch && cityMatch;
  });
};
