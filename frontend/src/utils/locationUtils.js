/**
 * Calculates the Haversine distance in kilometers between two sets of coordinates.
 * @param {number} lat1 
 * @param {number} lng1 
 * @param {number} lat2 
 * @param {number} lng2 
 * @returns {number|null}
 */
export const haversineDistanceKm = (lat1, lng1, lat2, lng2) => {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return null;
  
  const p1 = Number(lat1);
  const p2 = Number(lat2);
  const g1 = Number(lng1);
  const g2 = Number(lng2);

  if (isNaN(p1) || isNaN(p2) || isNaN(g1) || isNaN(g2)) return null;

  const R = 6371; // Earth's radius in km
  const dLat = (p2 - p1) * Math.PI / 180;
  const dLng = (g2 - g1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(p1 * Math.PI / 180) * Math.cos(p2 * Math.PI / 180) * 
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
};

/**
 * Returns true if the place is within radiusKm of the location context coordinates.
 * @param {object} place 
 * @param {object} context 
 * @param {number} radiusKm 
 * @returns {boolean}
 */
export const isNearbyPlace = (place, context, radiusKm = 50) => {
  if (!place || !context) return false;
  const placeLat = place.latitude ?? place.lat;
  const placeLng = place.longitude ?? place.lng ?? place.lon;
  const contextLat = context.latitude ?? context.lat;
  const contextLng = context.longitude ?? context.lng ?? context.lon;

  if (placeLat == null || placeLng == null || contextLat == null || contextLng == null) {
    return false;
  }

  const dist = haversineDistanceKm(placeLat, placeLng, contextLat, contextLng);
  return dist !== null && dist <= radiusKm;
};

/**
 * Clean up text for location matching (lowercase, alphanumeric with spaces)
 * @param {string} text 
 * @returns {string}
 */
export const normalizeLocationText = (text) => {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Performs a fuzzy check if the query string matches any key properties of the place.
 * @param {string} query 
 * @param {object} place 
 * @returns {boolean}
 */
export const fuzzyMatchLocation = (query, place) => {
  if (!query || !place) return false;
  const normQuery = normalizeLocationText(query);
  const label = normalizeLocationText(place.label || place.description || place.value || '');
  const city = normalizeLocationText(place.city || '');
  const locality = normalizeLocationText(place.locality || '');

  return label.includes(normQuery) || city.includes(normQuery) || locality.includes(normQuery);
};

/**
 * Ranks an array of place suggestions dynamically based on query string matching,
 * coordinate proximity, same-city matches, and source weightings.
 * @param {string} query 
 * @param {Array} placesList 
 * @param {object} context 
 * @returns {Array}
 */
export const rankPlacesByRelevance = (query, placesList, context) => {
  if (!placesList || !Array.isArray(placesList)) return [];

  const normQuery = normalizeLocationText(query);
  const userLat = context?.latitude;
  const userLng = context?.longitude;
  const userCity = normalizeLocationText(context?.city || '');
  const userLocality = normalizeLocationText(context?.locality || '');
  const userState = normalizeLocationText(context?.state || '');

  const scored = placesList.map(place => {
    let score = 0;
    const label = normalizeLocationText(place.label || place.description || place.value || '');
    const city = normalizeLocationText(place.city || '');
    const locality = normalizeLocationText(place.locality || '');
    const state = normalizeLocationText(place.state || '');

    // 1. Text-based string relevance
    if (label === normQuery) {
      score += 1500;
    } else if (label.startsWith(normQuery)) {
      score += 800;
    } else if (label.includes(normQuery)) {
      score += 300;
    }

    if (city && city === normQuery) score += 500;
    if (locality && locality === normQuery) score += 400;

    // 2. Coordinate proximity matching (Haversine)
    const placeLat = place.latitude ?? place.lat;
    const placeLng = place.longitude ?? place.lng ?? place.lon;

    if (userLat != null && userLng != null && placeLat != null && placeLng != null) {
      const dist = haversineDistanceKm(userLat, userLng, placeLat, placeLng);
      place.distanceFromUserKm = dist;

      if (dist !== null) {
        if (dist <= 5) score += 1000;
        else if (dist <= 15) score += 700;
        else if (dist <= 30) score += 500;
        else if (dist <= 60) score += 300;
        else if (dist <= 120) score += 100;

        // Apply a fine-grained distance penalty to break ties
        score -= (dist * 2);
      }
    }

    // 3. User location context alignment
    if (userLocality && locality === userLocality) score += 400;
    if (userCity && city === userCity) score += 300;
    if (userState && state === userState) score += 80;

    // 4. Source weighting
    if (place.source === 'google_nearby') score += 200;
    else if (place.source === 'google_country') score += 100;
    else if (place.source === 'google_global') score += 50;
    else if (place.source === 'static_fallback') score -= 200;

    return {
      ...place,
      relevanceScore: score,
    };
  });

  // Sort in descending order of relevance score
  return scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
};
