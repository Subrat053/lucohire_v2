const prisma = require('../config/prisma');
const { withLegacyId } = require('../utils/prismaResponse');
const { haversineDistanceKm } = require('../utils/distance');

/**
 * Finds the nearest city in our seeded CityGeo database to the given coordinates.
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {Promise<Object|null>}
 */
async function findNearestCity(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return null;
  }

  try {
    const cities = await prisma.cityGeo.findMany();
    let nearest = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const city of cities) {
      const coordinates = city.location?.coordinates;
      if (!Array.isArray(coordinates) || coordinates.length < 2) continue;
      const cityLng = Number(coordinates[0]);
      const cityLat = Number(coordinates[1]);
      if (!Number.isFinite(cityLat) || !Number.isFinite(cityLng)) continue;
      const distance = haversineDistanceKm(lat, lng, cityLat, cityLng);
      if (distance < nearestDistance) {
        nearest = city;
        nearestDistance = distance;
      }
    }

    return withLegacyId(nearest);
  } catch (error) {
    console.error("Error in findNearestCity:", error);
    return null;
  }
}

module.exports = {
  findNearestCity,
};
