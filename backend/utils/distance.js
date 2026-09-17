function toRadians(value) {
  return (value * Math.PI) / 180;
}

function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const earthRadiusKm = 6371;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2)
    + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2))
    * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function distanceAdjustedScore(baseScore, distanceKm, maxRadiusKm = 50) {
  const base = Number(baseScore || 0);
  const distance = Number(distanceKm);
  const radius = Number(maxRadiusKm || 50);

  if (!Number.isFinite(distance) || distance < 0) return base;
  if (!Number.isFinite(radius) || radius <= 0) return base;

  const penaltyRatio = Math.min(1, distance / radius) * 0.3; // max 30% penalty at radius edge
  return Math.max(0, Number((base * (1 - penaltyRatio)).toFixed(2)));
}

function isWithinRadius(distanceKm, radiusKm) {
  const distance = Number(distanceKm);
  const radius = Number(radiusKm);
  if (!Number.isFinite(distance) || !Number.isFinite(radius)) return false;
  return distance <= radius;
}

module.exports = {
  haversineDistanceKm,
  distanceAdjustedScore,
  isWithinRadius,
};
