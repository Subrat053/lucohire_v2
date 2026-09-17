const axios = require('axios');
const prisma = require('../config/prisma');
const { withLegacyId } = require('../utils/prismaResponse');
const { haversineDistanceKm } = require('../utils/distance');

const RADIUS_METERS = 50000;
const RESULT_LIMIT = 20;

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizePlace = (item, source, origin) => {
  const lat = toNumber(item.lat ?? item.latitude);
  const lon = toNumber(item.lon ?? item.longitude);
  if (lat === null || lon === null) return null;

  const normalized = {
    name: item.name || item.formatted || item.city || 'Unknown',
    lat,
    lon,
    source,
  };

  if (origin) {
    normalized.distance = haversineDistanceKm(origin.lat, origin.lon, lat, lon);
  }

  return normalized;
};

async function getCoordinatesFromText(text) {
  if (!text || !String(text).trim()) return null;

  const apiKey = String(process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_VISION_API_KEY || '').trim();
  if (apiKey) {
    try {
      const { searchPlaces, getPlaceDetails } = require('./googlePlacesService');
      const places = await searchPlaces(text);
      if (places.length > 0) {
        const details = await getPlaceDetails(places[0].placeId);
        if (details.latitude !== null && details.longitude !== null) {
          return { lat: details.latitude, lon: details.longitude };
        }
      }
    } catch (err) {
      console.warn('Google geocoding error:', err.message);
    }
  }

  // Without Google Places configured, we check DB or return null
  return null;
}

async function getAutocompleteSuggestions(text) {
  const query = String(text || '').trim();
  if (!query || query.length < 3) return [];

  const apiKey = String(process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_VISION_API_KEY || '').trim();
  if (apiKey) {
    try {
      const { searchPlaces } = require('./googlePlacesService');
      const places = await searchPlaces(query);
      if (places.length > 0) {
        return places.map(p => ({
          placeId: p.placeId,
          name: p.name,
          formattedAddress: p.formattedAddress,
          source: 'google',
        }));
      }
    } catch (err) {
      console.warn('Google autocomplete error:', err.message);
    }
  }

  return [];
}

async function getNearbyFromAPI(lat, lon) {
  const origin = { lat: toNumber(lat), lon: toNumber(lon) };
  if (origin.lat === null || origin.lon === null) return [];

  const apiKey = String(process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_VISION_API_KEY || '').trim();
  if (apiKey) {
    try {
      const url = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
      const { data } = await axios.get(url, {
        params: {
          location: `${origin.lat},${origin.lon}`,
          radius: RADIUS_METERS,
          type: 'locality',
          key: apiKey,
        },
        timeout: 7000,
      });

      if (data.status === 'OK' && Array.isArray(data.results)) {
        return data.results
          .map((item) => {
            const resLat = item.geometry?.location?.lat;
            const resLon = item.geometry?.location?.lng;
            if (resLat === undefined || resLon === undefined) return null;

            return normalizePlace({
              name: item.name || item.vicinity,
              lat: resLat,
              lon: resLon,
            }, 'google', origin);
          })
          .filter(Boolean);
      }
    } catch (err) {
      console.warn('Google nearby search error:', err.message);
    }
  }

  return [];
}

async function getNearbyFromDB(lat, lon) {
  const origin = { lat: toNumber(lat), lon: toNumber(lon) };
  if (origin.lat === null || origin.lon === null) return [];

  const locations = await prisma.location.findMany({
    select: { id: true, name: true, latitude: true, longitude: true, type: true },
  });

  return locations
    .map((item) => {
      const distance = haversineDistanceKm(origin.lat, origin.lon, item.latitude, item.longitude);
      return {
        name: item.name,
        lat: item.latitude,
        lon: item.longitude,
        distance,
        source: 'db',
      };
    })
    .filter((item) => item.distance <= 50);
}

function mergeResults(apiResults, dbResults) {
  const seen = new Set();
  const merged = [];

  [...apiResults, ...dbResults].forEach((item) => {
    if (!item) return;
    const lat = toNumber(item.lat);
    const lon = toNumber(item.lon);
    if (lat === null || lon === null) return;

    const key = `${String(item.name || '').toLowerCase()}|${lat.toFixed(4)}|${lon.toFixed(4)}`;
    if (seen.has(key)) return;

    const distance = item.distance ?? null;
    merged.push({
      name: item.name,
      lat,
      lon,
      source: item.source,
      ...(distance !== null ? { distance } : {}),
    });
    seen.add(key);
  });

  return merged
    .sort((a, b) => {
      const da = a.distance ?? Number.POSITIVE_INFINITY;
      const db = b.distance ?? Number.POSITIVE_INFINITY;
      return da - db;
    })
    .slice(0, RESULT_LIMIT);
}

async function upsertLocationRecord({ name, latitude, longitude, type = 'place' }) {
  if (!name) return null;
  const lat = toNumber(latitude);
  const lon = toNumber(longitude);
  if (lat === null || lon === null) return null;

  const existing = await prisma.location.findFirst({
    where: {
      name: String(name).trim(),
      latitude: { gte: lat - 0.0001, lte: lat + 0.0001 },
      longitude: { gte: lon - 0.0001, lte: lon + 0.0001 },
    },
  });

  if (existing) return withLegacyId(existing);

  return withLegacyId(await prisma.location.create({
    data: {
      name: String(name).trim(),
      latitude: lat,
      longitude: lon,
      type,
    },
  }));
}

module.exports = {
  getCoordinatesFromText,
  getAutocompleteSuggestions,
  getNearbyFromAPI,
  getNearbyFromDB,
  mergeResults,
  upsertLocationRecord,
};
