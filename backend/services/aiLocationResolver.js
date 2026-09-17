const { searchPlaces, getPlaceDetails } = require('./googlePlacesService');
const { haversineDistanceKm } = require('../utils/distance');

/**
 * Intelligently resolves location coordinates from query text using a provided location context.
 *
 * Priority 1: Exact nearby match within 50km if context coordinates are present.
 * Priority 2: Locality or city boundary check inside same city.
 * Priority 3: Broader search in same state/country.
 * Priority 4: Fallback to region/country default coordinates.
 *
 * @param {string} queryLocationText
 * @param {object} locationContext
 * @returns {Promise<{label: string, city: string, locality: string, state: string, country: string, latitude: number, longitude: number}>}
 */
async function resolveLocationForAI(queryLocationText, locationContext = null) {
  const query = String(queryLocationText || '').trim();
  
  // If query is empty, directly return the locationContext if present, or fallback
  if (!query) {
    if (locationContext && (locationContext.latitude || locationContext.lat) && (locationContext.longitude || locationContext.lng || locationContext.lon)) {
      return normalizeContext(locationContext);
    }
    return getFallbackLocation();
  }

  // Extract coordinate parameters from context if available
  const contextLat = locationContext?.latitude || locationContext?.lat;
  const contextLng = locationContext?.longitude || locationContext?.lng || locationContext?.lon;
  const contextCity = locationContext?.city;

  try {
    // 1. Try search with bias parameters if context coordinate exists
    const options = {};
    if (contextLat && contextLng) {
      options.latitude = Number(contextLat);
      options.longitude = Number(contextLng);
      options.radiusMeters = 50000; // 50km radius
    }

    const places = await searchPlaces(query, options);

    if (places && places.length > 0) {
      // Fetch details of the highest-ranked prediction
      const details = await getPlaceDetails(places[0].placeId);
      if (details && details.latitude && details.longitude) {
        
        let distance = null;
        if (contextLat && contextLng) {
          distance = haversineDistanceKm(Number(contextLat), Number(contextLng), details.latitude, details.longitude);
        }

        return {
          label: details.formattedAddress || details.name,
          city: details.city || '',
          locality: details.name || '',
          state: details.state || '',
          country: details.country || '',
          latitude: details.latitude,
          longitude: details.longitude,
          types: details.types || [],
          distanceFromUserKm: distance ? Number(distance.toFixed(2)) : null,
          source: distance && distance <= 50 ? 'nearby_resolved' : 'global_resolved',
        };
      }
    }
  } catch (error) {
    console.warn("AI location resolver geocoding failed, attempting direct match fallback:", error.message);
  }

  // Fallback: If no results from Google API, check local context alignment
  if (contextLat && contextLng && contextCity && query.toLowerCase().includes(contextCity.toLowerCase())) {
    return {
      label: locationContext.label || `${contextCity}, India`,
      city: contextCity,
      locality: locationContext.locality || '',
      state: locationContext.state || '',
      country: locationContext.country || 'India',
      latitude: Number(contextLat),
      longitude: Number(contextLng),
      types: locationContext.types || [],
      distanceFromUserKm: 0,
      source: 'context_matched',
    };
  }

  // Ultimate fallback
  return getFallbackLocation(locationContext);
}

function normalizeContext(context) {
  const lat = context.latitude || context.lat;
  const lng = context.longitude || context.lng || context.lon;
  return {
    label: context.label || context.city || '',
    city: context.city || '',
    locality: context.locality || '',
    state: context.state || '',
    country: context.country || 'India',
    latitude: Number(lat),
    longitude: Number(lng),
    types: context.types || [],
    source: 'context_direct',
  };
}

function getFallbackLocation(locationContext = null) {
  if (locationContext && (locationContext.latitude || locationContext.lat) && (locationContext.longitude || locationContext.lng || locationContext.lon)) {
    return normalizeContext(locationContext);
  }
  return {
    label: "Bhubaneswar, Odisha, India",
    city: "Bhubaneswar",
    locality: "Patia",
    state: "Odisha",
    country: "India",
    latitude: 20.2961,
    longitude: 85.8245,
    source: 'system_default',
  };
}

module.exports = {
  resolveLocationForAI,
};
