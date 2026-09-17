function validateLatLng(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);

  if (Number.isNaN(lat) || lat < -90 || lat > 90) {
    throw new Error("Invalid latitude: must be between -90 and 90");
  }

  if (Number.isNaN(lng) || lng < -180 || lng > 180) {
    throw new Error("Invalid longitude: must be between -180 and 180");
  }

  return {
    latitude: lat,
    longitude: lng,
  };
}

function buildGeoPoint(latitude, longitude) {
  return {
    type: "Point",
    coordinates: [Number(longitude), Number(latitude)],
  };
}

module.exports = {
  validateLatLng,
  buildGeoPoint,
};
