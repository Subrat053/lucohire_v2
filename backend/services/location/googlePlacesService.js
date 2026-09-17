const axios = require('axios');

// Fetches standardized address and coordinates using Google Places API (New).
// param rawLocation - The raw location string from user (e.g., "Akshardham")
// param country - Optional user country to bias the search (e.g., "India")
// returns Promise with an array of matches: [{standardizedAddress, latitude, longitude}]
const handelFetchStandardizedLocation = async (rawLocation, country = null) => {
  if (!rawLocation || typeof rawLocation !== 'string') {
    return [];
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.warn('GOOGLE_PLACES_API_KEY is not configured in environment variables.');
    return [{ standardizedAddress: rawLocation, latitude: null, longitude: null }];
  }

  try {
    // Append country context if provided to help Google narrow it down
    const query = country ? `${rawLocation.trim()}, ${country.trim()}` : rawLocation.trim();

    const response = await axios.post(
      'https://places.googleapis.com/v1/places:searchText',
      {
        textQuery: query,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.formattedAddress,places.location',
        },
        timeout: 5000,
      }
    );

    const places = response.data.places;
    if (places && places.length > 0) {
      // Return up to top 3 matches for the user to pick from if ambiguous
      return places.slice(0, 3).map(place => ({
        standardizedAddress: place.formattedAddress || null,
        latitude: place.location?.latitude || null,
        longitude: place.location?.longitude || null,
      }));
    }

    return [];
  } catch (error) {
    console.error('Error fetching data from Google Places API:', error?.response?.data || error.message);
    return [{ standardizedAddress: rawLocation, latitude: null, longitude: null }];
  }
}

module.exports = {
  handelFetchStandardizedLocation,
};
