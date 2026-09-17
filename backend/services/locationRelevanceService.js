const { getCoordinatesFromText } = require('./locationService');

const LOCATION_GROUPS = {
  bhubaneswar: {
    label: 'Bhubaneswar',
    state: 'Odisha',
    aliases: ['bbsr', 'bhubaneshwar', 'bhubaneswar city'],
    nearby: ['patia', 'khandagiri', 'rasulgarh', 'chandrasekharpur', 'old town', 'cuttack', 'jatni', 'khurda'],
  },
  noida: {
    label: 'Noida',
    state: 'Uttar Pradesh',
    aliases: ['greater noida', 'noida extension', 'ncr noida'],
    nearby: ['greater noida', 'noida extension', 'sector 62', 'sector 18', 'ghaziabad', 'delhi'],
  },
  delhi: {
    label: 'Delhi',
    state: 'Delhi',
    aliases: ['new delhi', 'ncr', 'delhi ncr'],
    nearby: ['gurugram', 'ghaziabad', 'noida', 'faridabad', 'dwarka', 'rohini'],
  },
  gurugram: {
    label: 'Gurugram',
    state: 'Haryana',
    aliases: ['gurgaon'],
    nearby: ['golf course road', 'sohna', 'manesar', 'faridabad', 'delhi'],
  },
  mumbai: {
    label: 'Mumbai',
    state: 'Maharashtra',
    aliases: ['bombay', 'navi mumbai', 'thane'],
    nearby: ['thane', 'navi mumbai', 'andheri', 'borivali', 'powai'],
  },
  bengaluru: {
    label: 'Bengaluru',
    state: 'Karnataka',
    aliases: ['bangalore', 'bengalore'],
    nearby: ['whitefield', 'electronic city', 'hsr layout', 'marathahalli', 'malleshwaram'],
  },
  hyderabad: {
    label: 'Hyderabad',
    state: 'Telangana',
    aliases: ['secunderabad'],
    nearby: ['gachibowli', 'hitech city', 'jubilee hills', 'miyapur', 'kukatpally'],
  },
  chennai: {
    label: 'Chennai',
    state: 'Tamil Nadu',
    aliases: ['madras'],
    nearby: ['adyar', 'tambaram', 'velachery', 'anna nagar', 't nagar'],
  },
  kolkata: {
    label: 'Kolkata',
    state: 'West Bengal',
    aliases: ['calcutta'],
    nearby: ['salt lake', 'new town', 'howrah', 'tollygunge', 'behala'],
  },
  pune: {
    label: 'Pune',
    state: 'Maharashtra',
    aliases: ['poona'],
    nearby: ['hinjewadi', 'wakad', 'baner', 'kothrud', 'viman nagar'],
  },
  ahmedabad: {
    label: 'Ahmedabad',
    state: 'Gujarat',
    aliases: ['amdavad'],
    nearby: ['navrangpura', 'bodakdev', 'maninagar', 'sg highway', 'changodar'],
  },
  jaipur: {
    label: 'Jaipur',
    state: 'Rajasthan',
    aliases: ['pink city'],
    nearby: ['malviya nagar', 'mansarovar', 'vaishali nagar', 'sanganer'],
  },
};

const normalizeLocationText = (value = '') =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const uniq = (list) => Array.from(new Set(list.filter(Boolean)));

function findLocationGroup(locationText = '') {
  const normalized = normalizeLocationText(locationText);
  if (!normalized) return null;

  const entries = Object.entries(LOCATION_GROUPS);
  for (const [key, group] of entries) {
    const labelNorm = normalizeLocationText(group.label);
    if (normalized === key || normalized === labelNorm) return { key, ...group };

    const aliases = [group.label, ...(group.aliases || [])].map(normalizeLocationText);
    if (aliases.some((alias) => alias && (normalized === alias || normalized.includes(alias) || alias.includes(normalized)))) {
      return { key, ...group };
    }
  }

  return null;
}

async function createLocationContext(locationText = '', locationData = null) {
  const raw = String(locationText || '').trim();
  const normalized = normalizeLocationText(raw);
  const group = findLocationGroup(raw);
  const state = group?.state || locationData?.state || '';
  const variants = uniq([
    raw,
    normalized,
    group?.label,
    group?.state,
    locationData?.state,
    ...(group?.aliases || []),
    ...(group?.nearby || []),
  ].map((value) => String(value || '').trim()).filter(Boolean));

  let coordinates = null;
  if (raw) {
    try {
      coordinates = await getCoordinatesFromText(raw);
    } catch (_) {
      coordinates = null;
    }
  }

  return {
    raw,
    normalized,
    variants,
    group,
    state,
    nearby: group?.nearby || [],
    coordinates: coordinates || (locationData?.latitude && locationData?.longitude ? { lat: locationData.latitude, lon: locationData.longitude } : null),
  };
}

function normalizeProviderLocation(provider = {}) {
  const locObj = provider.location || {};
  const locData = provider.locationData || {};
  const servLoc = provider.serviceLocationData || {};

  return normalizeLocationText([
    provider.city,
    provider.state,
    provider.nearestLocation,
    typeof provider.location === 'string' ? provider.location : '',
    locObj.city,
    locObj.state,
    locObj.name,
    locObj.formattedAddress,
    locData.city,
    locData.state,
    locData.formattedAddress,
    servLoc.city,
    servLoc.state,
    servLoc.formattedAddress,
    provider.address?.city,
    provider.address?.state,
  ].filter(Boolean).join(' '));
}

function scoreLocationRelevance(provider = {}, context = {}, distanceKm = null) {
  const locationQuery = normalizeLocationText(context?.raw || '');
  if (!locationQuery) {
    return { score: 0, level: 'none', label: '', matched: false };
  }

  const providerLocation = normalizeProviderLocation(provider);
  const providerState = normalizeLocationText(provider?.state || provider?.address?.state || '');
  const providerCity = normalizeLocationText(provider?.city || provider?.address?.city || '');
  const providerNearest = normalizeLocationText(provider?.nearestLocation || '');

  const exactTerms = [locationQuery, normalizeLocationText(context?.group?.label || '')].filter(Boolean);
  const aliasTerms = uniq([...(context?.variants || []), ...(context?.group?.aliases || [])].map(normalizeLocationText));
  const nearbyTerms = uniq([...(context?.group?.nearby || [])].map(normalizeLocationText));
  const stateTerm = normalizeLocationText(context?.state || context?.group?.state || '');

  const isExact = exactTerms.some((term) => term && (providerCity === term || providerLocation === term || providerNearest === term));
  if (isExact) {
    return { score: 100, level: 'exact', label: context?.group?.label || context?.raw || '', matched: true };
  }

  const aliasMatch = aliasTerms.some((term) => term && (providerCity.includes(term) || providerNearest.includes(term) || providerLocation.includes(term) || term.includes(providerCity)));
  if (aliasMatch) {
    return { score: 92, level: 'alias', label: context?.group?.label || context?.raw || '', matched: true };
  }

  const nearbyMatch = nearbyTerms.some((term) => term && (providerCity.includes(term) || providerNearest.includes(term) || providerLocation.includes(term)));
  if (nearbyMatch) {
    return { score: 84, level: 'nearby', label: context?.group?.label || context?.raw || '', matched: true };
  }

  const sameState = stateTerm && (providerState === stateTerm || providerLocation.includes(stateTerm));
  if (sameState) {
    return { score: 72, level: 'state', label: context?.group?.state || context?.state || '', matched: true };
  }

  if (distanceKm !== null && Number.isFinite(distanceKm)) {
    if (distanceKm <= 5) return { score: 90, level: 'geo', label: context?.group?.label || context?.raw || '', matched: true };
    if (distanceKm <= 10) return { score: 86, level: 'geo', label: context?.group?.label || context?.raw || '', matched: true };
    if (distanceKm <= 25) return { score: 78, level: 'geo', label: context?.group?.label || context?.raw || '', matched: true };
    if (distanceKm <= 50) return { score: 68, level: 'geo', label: context?.group?.label || context?.raw || '', matched: true };
    if (distanceKm <= 100) return { score: 58, level: 'geo', label: context?.group?.label || context?.raw || '', matched: true };
  }

  return { score: 18, level: 'national', label: context?.group?.label || context?.raw || '', matched: false };
}

function buildLocationMessage(context = {}, locationLevel = 'national') {
  if (!context?.raw) return '';

  const label = context.group?.label || context.raw;
  const stateLabel = context.group?.state || context.state;

  switch (locationLevel) {
    case 'exact':
      return '';
    case 'alias':
    case 'nearby':
    case 'geo':
      return `No exact matches in ${label}. Showing nearby providers instead.`;
    case 'state':
      return stateLabel ? `Showing providers from nearby ${stateLabel} locations.` : `Showing broader nearby providers for ${label}.`;
    default:
      return `Showing broader providers for ${label}.`;
  }
}

module.exports = {
  LOCATION_GROUPS,
  createLocationContext,
  findLocationGroup,
  normalizeLocationText,
  scoreLocationRelevance,
  buildLocationMessage,
};
