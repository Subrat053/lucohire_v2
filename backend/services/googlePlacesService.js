const axios = require('axios');
const { AppError } = require('../utils/appError');

const PLACES_AUTOCOMPLETE_URL = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
const PLACE_DETAILS_URL = 'https://maps.googleapis.com/maps/api/place/details/json';

function hasCoordinate(value) {
  return value !== undefined && value !== null && String(value).trim() !== '' && Number.isFinite(Number(value));
}

function normalizeTypes(types) {
  if (!types) return undefined;
  if (Array.isArray(types)) return types.filter(Boolean).join('|');
  return String(types).split(',').map(type => type.trim()).filter(Boolean).join('|') || undefined;
}

function getApiKey() {
  const apiKey = String(process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_VISION_API_KEY || '').trim();
  if (!apiKey) {
    throw new AppError('Missing GOOGLE_PLACES_API_KEY or GOOGLE_API_KEY in environment variables', 500, 'ENV_VALIDATION_ERROR');
  }
  return apiKey;
}

/**
 * Search for places using Google Places Autocomplete API
 * @param {string} query 
 * @returns {Promise<Array>}
 */
async function searchPlaces(query, options = {}) {
  if (!query || !String(query).trim()) return [];
  const apiKey = getApiKey();

  const lat = options.latitude || options.lat;
  const lng = options.longitude || options.lng;
  const radius = options.radiusMeters || options.radius || 30000;
  const types = normalizeTypes(options.types);
  const country = String(options.country || '').trim().toLowerCase();

  try {
    const response = await axios.get(PLACES_AUTOCOMPLETE_URL, {
      params: {
        input: String(query).trim(),
        key: apiKey,
        ...(hasCoordinate(lat) && hasCoordinate(lng) ? { location: `${lat},${lng}`, radius } : {}),
        ...(types ? { types } : {}),
        ...(country ? { components: `country:${country}` } : {}),
      },
      timeout: 10000,
    });

    if (response.data.status === 'ZERO_RESULTS') return [];
    
    if (response.data.status !== 'OK') {
      throw new Error(`Google Places API error: ${response.data.status} - ${response.data.error_message || ''}`);
    }

    const predictions = response.data.predictions || [];
    return predictions.map(p => ({
      placeId: p.place_id,
      name: p.structured_formatting?.main_text || p.description,
      formattedAddress: p.description,
      types: p.types,
    }));
  } catch (error) {
    console.error('Google Places Search Error:', error.response?.data || error.message);
    if (error instanceof AppError) throw error;
    throw new AppError(`Failed to search places: ${error.message}`, 502, 'PLACES_API_ERROR', error.response?.data);
  }
}


/**
 * Get full details for a place using Google Place Details API
 * @param {string} placeId 
 * @returns {Promise<Object>}
 */
async function getPlaceDetails(placeId) {
  if (!placeId) throw new AppError('placeId is required', 400);
  const apiKey = getApiKey();

  try {
    const response = await axios.get(PLACE_DETAILS_URL, {
      params: {
        place_id: placeId,
        fields: 'formatted_address,geometry,address_components,place_id,name,types',
        key: apiKey,
      },
      timeout: 10000,
    });

    if (response.data.status !== 'OK') {
      throw new Error(`Google Place Details error: ${response.data.status} - ${response.data.error_message || ''}`);
    }

    const result = response.data.result;
    const components = result.address_components || [];

    const getComponent = (type, useShort = false) => {
      const comp = components.find(c => c.types.includes(type));
      if (!comp) return '';
      return useShort ? comp.short_name : comp.long_name;
    };

    return {
      placeId: result.place_id,
      name: result.name,
      formattedAddress: result.formatted_address,
      latitude: result.geometry?.location?.lat,
      longitude: result.geometry?.location?.lng,
      city: getComponent('locality') || getComponent('administrative_area_level_2'),
      state: getComponent('administrative_area_level_1'),
      country: getComponent('country'),
      countryCode: getComponent('country', true),
      postalCode: getComponent('postal_code'),
      types: result.types,
      source: 'google_places',
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to get place details', 502, 'PLACES_API_ERROR', error.response?.data || error.message);
  }
}

module.exports = {
  searchPlaces,
  getPlaceDetails,
};
