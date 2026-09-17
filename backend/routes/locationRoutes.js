const express = require('express');
const { autocompleteLocation, nearbyLocations } = require('../controllers/locationController');

const router = express.Router();

router.post('/autocomplete', autocompleteLocation);
router.post('/nearby', nearbyLocations);

router.get('/search', async (req, res) => {
  try {
    const { query, latitude, lat, longitude, lng, radiusMeters, radius, types, country } = req.query;
    if (!query) return res.status(400).json({ success: false, message: 'Query is required' });
    
    const { searchPlaces } = require('../services/googlePlacesService');
    const data = await searchPlaces(query, {
      latitude,
      lat,
      longitude,
      lng,
      radiusMeters,
      radius,
      types,
      country,
    });
    
    res.json({ success: true, data });
  } catch (error) {
    console.error('Location search error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});


router.get('/details/:placeId', async (req, res) => {
  try {
    const { placeId } = req.params;
    const { getPlaceDetails } = require('../services/googlePlacesService');
    const data = await getPlaceDetails(placeId);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


module.exports = router;
