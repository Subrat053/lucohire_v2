import { locationAPI } from './api';
import { haversineDistanceKm } from '../utils/locationUtils';

let scriptLoadingPromise = null;

/**
 * Clean location label by removing " Division" and removing duplicate components (e.g. "Delhi, Delhi, India" -> "Delhi, India").
 * @param {string} label 
 * @returns {string}
 */
export const cleanLocationLabel = (label) => {
  if (!label) return '';
  let cleaned = label.replace(/\s+Division\b/gi, '');
  const parts = cleaned.split(',').map(p => p.trim()).filter(Boolean);
  const uniqueParts = [];
  for (const part of parts) {
    if (!uniqueParts.includes(part)) {
      uniqueParts.push(part);
    }
  }
  return uniqueParts.join(', ');
};

/**
 * Dynamically loads the Google Places API script if not already loaded.
 * Uses the environment variable VITE_GOOGLE_PLACES_API_KEY.
 * @returns {Promise<any>}
 */
export const loadGooglePlacesScript = () => {
  if (typeof window !== 'undefined' && window.google && window.google.maps && window.google.maps.places) {
    if (window.google.maps.importLibrary) {
      return window.google.maps.importLibrary('places');
    }
    return Promise.resolve(window.google.maps.places);
  }

  if (scriptLoadingPromise) {
    return scriptLoadingPromise;
  }

  scriptLoadingPromise = new Promise((resolve, reject) => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.VITE_GOOGLE_PLACES_API_KEY || '';
    if (!apiKey) {
      console.warn('Google Maps API key is not defined in environment variables. Google Places Autocomplete will rely on backend fallbacks.');
    }

    if (import.meta.env.DEV) {
      console.log('[GooglePlacesService] Loading Google Maps JS API script tags...');
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      let attempts = 0;
      const checkPlacesLoaded = async () => {
        if (window.google && window.google.maps && (window.google.maps.importLibrary || window.google.maps.places)) {
          const places = window.google.maps.importLibrary
            ? await window.google.maps.importLibrary('places')
            : window.google.maps.places;

          if (import.meta.env.DEV) {
            console.log('[GooglePlacesService] Places library successfully available after script load.');
          }
          resolve(places);
        } else if (attempts < 20) {
          attempts++;
          setTimeout(checkPlacesLoaded, 50);
        } else {
          reject(new Error('Google Places library not available after script load (timed out)'));
        }
      };
      checkPlacesLoaded();
    };
    script.onerror = (err) => {
      reject(new Error('Failed to load Google Maps/Places API script: ' + err.message));
    };
    document.head.appendChild(script);
  });

  return scriptLoadingPromise;
};

/**
 * Initializes a Google Places Autocomplete element.
 * @param {HTMLInputElement} inputElement 
 * @param {object} options 
 * @returns {Promise<any>}
 */
export const initGooglePlacesAutocomplete = async (inputElement, options = {}) => {
  if (!inputElement) return null;
  try {
    const places = await loadGooglePlacesScript();
    const autocomplete = new places.Autocomplete(inputElement, options);
    return autocomplete;
  } catch (error) {
    console.error('Failed to initialize Google Places Autocomplete element:', error);
    return null;
  }
};

/**
 * Fetch predictions from Google Places Autocomplete service.
 * Falls back to the backend endpoint if direct browser call fails or key is missing.
 * @param {string} query 
 * @param {object} options 
 * @returns {Promise<Array>}
 */
export const getPlacePredictions = async (query, options = {}) => {
  if (!query || query.trim().length < 2) return [];

  // Default coordinate/bias settings
  const nearbyFirst = options.nearbyFirst !== false;
  const lat = options.latitude || options.lat;
  const lng = options.longitude || options.lng;
  const radius = options.radiusMeters || 30000;
  const country = options.country;

  try {
    const places = await loadGooglePlacesScript();

    // 1. Try modern AutocompleteSuggestion (Places API New, required as of March 2025)
    if (places.AutocompleteSuggestion) {
      const sessionToken = options.sessionToken || new places.AutocompleteSessionToken();

      const getSuggestions = async (useBias) => {
        let locationBias = null;
        if (useBias && lat && lng) {
          const center = { lat: Number(lat), lng: Number(lng) };
          try {
            locationBias = new places.Circle({ center, radius: Number(radius) });
          } catch (_) {
            locationBias = { center, radius: Number(radius) };
          }
        }

        const request = {
          input: query,
          sessionToken,
          ...(locationBias ? { locationBias } : {}),
          ...(options.types ? { includedPrimaryTypes: options.types } : {}),
          ...(country ? { includedRegionCodes: [country] } : {}),
        };

        const { suggestions } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
        return suggestions || [];
      };

      let suggestions = [];
      let source = "google_global";

      if (nearbyFirst && lat && lng) {
        // Parallel fetch biased and global suggestions to prevent location override/biasing issues
        const [nearbySuggestions, globalSuggestions] = await Promise.all([
          getSuggestions(true),
          getSuggestions(false)
        ]);

        const seen = new Set();
        const merged = [];

        for (const s of nearbySuggestions) {
          const id = s.placePrediction?.placeId;
          if (id && !seen.has(id)) {
            seen.add(id);
            s._source = "google_nearby";
            merged.push(s);
          }
        }

        for (const s of globalSuggestions) {
          const id = s.placePrediction?.placeId;
          if (id && !seen.has(id)) {
            seen.add(id);
            s._source = country ? "google_country" : "google_global";
            merged.push(s);
          }
        }

        suggestions = merged;
      } else {
        suggestions = await getSuggestions(false);
        source = country ? "google_country" : "google_global";
        suggestions.forEach(s => {
          s._source = source;
        });
      }

      return suggestions.map(s => {
        const prediction = s.placePrediction;
        const main_text = cleanLocationLabel(prediction.mainText ? (typeof prediction.mainText === 'string' ? prediction.mainText : prediction.mainText.toString()) : '');
        const secondary_text = cleanLocationLabel(prediction.secondaryText ? (typeof prediction.secondaryText === 'string' ? prediction.secondaryText : prediction.secondaryText.toString()) : '');
        const description = cleanLocationLabel(prediction.text ? (typeof prediction.text === 'string' ? prediction.text : prediction.text.toString()) : (main_text + ' ' + secondary_text).trim());

        // Approximate city and state from secondary text
        const parts = secondary_text.split(',').map(p => p.trim());
        const city = parts[0] || '';
        const state = parts[1] || '';

        return {
          label: description,
          value: description,
          place_id: prediction.placeId,
          placeId: prediction.placeId,
          description: description,
          structured_formatting: {
            main_text: main_text,
            secondary_text: secondary_text,
          },
          city,
          locality: main_text,
          state,
          country: parts[parts.length - 1] || '',
          latitude: null,
          longitude: null,
          source: s._source || source,
          types: prediction.types || [],
        };
      });
    }

    // 2. Fallback to legacy AutocompleteService if new API is not loaded/supported
    if (places.AutocompleteService) {
      const service = new places.AutocompleteService();

      const getPredictionsLegacy = (useBias) => {
        let location = null;
        let radiusLegacy = null;

        if (useBias && lat && lng) {
          try {
            location = new google.maps.LatLng(Number(lat), Number(lng));
            radiusLegacy = Number(radius);
          } catch (_) { }
        }

        const request = {
          input: query,
          ...(location ? { location, radius: radiusLegacy } : {}),
          ...(options.types ? { types: options.types } : {}),
          ...(country ? { componentRestrictions: { country } } : {}),
        };

        return new Promise((resolve) => {
          service.getPlacePredictions(request, (predictions, status) => {
            if (status === 'OK' || status === 'ZERO_RESULTS') {
              resolve(predictions || []);
            } else {
              resolve([]);
            }
          });
        });
      };

      let predictions = [];
      let source = "google_global";

      if (nearbyFirst && lat && lng) {
        // Parallel fetch biased and global legacy predictions
        const [nearbyPredictions, globalPredictions] = await Promise.all([
          getPredictionsLegacy(true),
          getPredictionsLegacy(false)
        ]);

        const seen = new Set();
        const merged = [];

        for (const p of nearbyPredictions) {
          const id = p.place_id;
          if (id && !seen.has(id)) {
            seen.add(id);
            p._source = "google_nearby";
            merged.push(p);
          }
        }

        for (const p of globalPredictions) {
          const id = p.place_id;
          if (id && !seen.has(id)) {
            seen.add(id);
            p._source = country ? "google_country" : "google_global";
            merged.push(p);
          }
        }

        predictions = merged;
      } else {
        predictions = await getPredictionsLegacy(false);
        source = country ? "google_country" : "google_global";
        predictions.forEach(p => {
          p._source = source;
        });
      }

      return predictions.map(p => {
        const main_text = cleanLocationLabel(p.structured_formatting?.main_text || '');
        const secondary_text = cleanLocationLabel(p.structured_formatting?.secondary_text || '');
        const description = cleanLocationLabel(p.description || '');
        const parts = secondary_text.split(',').map(part => part.trim());

        return {
          label: description,
          value: description,
          place_id: p.place_id,
          placeId: p.place_id,
          description: description,
          structured_formatting: {
            main_text,
            secondary_text,
          },
          city: parts[0] || '',
          locality: main_text,
          state: parts[1] || '',
          country: parts[parts.length - 1] || '',
          latitude: null,
          longitude: null,
          source: p._source || source,
          types: p.types || [],
        };
      });
    }

    throw new Error('Neither AutocompleteSuggestion nor AutocompleteService is available on google.maps.places');
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Frontend Google predictions failed, falling back to backend:', error.message);
    }
    try {
      const { data } = await locationAPI.searchPlaces(query, options);
      const list = Array.isArray(data?.data) ? data.data : [];
      return list.map(p => {
        const label = cleanLocationLabel(p.formattedAddress || p.name);
        const name = cleanLocationLabel(p.name);
        const secText = cleanLocationLabel(p.formattedAddress);
        return {
          label: label,
          value: label,
          place_id: p.placeId,
          placeId: p.placeId,
          description: label,
          structured_formatting: {
            main_text: name,
            secondary_text: secText,
          },
          city: cleanLocationLabel(p.city || ''),
          locality: cleanLocationLabel(p.locality || p.name),
          state: cleanLocationLabel(p.state || ''),
          country: cleanLocationLabel(p.country || 'India'),
          latitude: p.latitude,
          longitude: p.longitude,
          source: "google_global",
          types: p.types || [],
        };
      });
    } catch (backendError) {
      console.error('Backend autocomplete search fallback failed:', backendError);
      throw error;
    }
  }
};

/**
 * Fetch full details for a place from Google Place Details service.
 * Falls back to the backend details endpoint if direct browser call fails.
 * @param {string} placeId 
 * @returns {Promise<object>}
 */
export const getPlaceDetails = async (placeId) => {
  if (!placeId) return null;

  try {
    const places = await loadGooglePlacesScript();

    // 1. Try modern Place class (Places API New, required as of March 2025)
    if (places.Place) {
      const place = new places.Place({ id: placeId });
      await place.fetchFields({
        fields: ['id', 'formattedAddress', 'displayName', 'addressComponents', 'location', 'types']
      });

      const mappedComponents = (place.addressComponents || []).map(comp => ({
        long_name: comp.longText || '',
        short_name: comp.shortText || '',
        types: comp.types || []
      }));

      return {
        place_id: place.id,
        name: place.displayName ? (typeof place.displayName === 'string' ? place.displayName : place.displayName.toString()) : '',
        formatted_address: place.formattedAddress || '',
        geometry: {
          location: {
            lat: () => {
              if (!place.location) return null;
              return typeof place.location.lat === 'function' ? place.location.lat() : place.location.lat;
            },
            lng: () => {
              if (!place.location) return null;
              return typeof place.location.lng === 'function' ? place.location.lng() : place.location.lng;
            }
          }
        },
        address_components: mappedComponents,
        types: place.types || [],
      };
    }

    // 2. Fallback to legacy PlacesService if modern API is not supported
    if (places.PlacesService) {
      const dummyElement = document.createElement('div');
      const service = new places.PlacesService(dummyElement);

      return new Promise((resolve, reject) => {
        service.getDetails(
          {
            placeId,
            fields: ['place_id', 'formatted_address', 'name', 'address_components', 'geometry', 'types'],
          },
          (place, status) => {
            if (status !== 'OK') {
              reject(new Error(`Google Places details failed with status: ${status}`));
              return;
            }
            resolve(place);
          }
        );
      });
    }

    throw new Error('Neither Place nor PlacesService is available on google.maps.places');
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Frontend Google place details failed, falling back to backend:', error.message);
    }
    try {
      const { data } = await locationAPI.getPlaceDetails(placeId);
      const details = data?.data;
      if (!details) throw new Error('No details returned from backend');

      return {
        place_id: details.placeId,
        name: details.name,
        formatted_address: details.formattedAddress,
        geometry: {
          location: {
            lat: () => details.latitude,
            lng: () => details.longitude,
          }
        },
        address_components: [
          { long_name: details.city || '', types: ['locality'] },
          { long_name: details.state || '', types: ['administrative_area_level_1'] },
          { long_name: details.country || '', types: ['country'] },
        ],
        types: details.types || [],
      };
    } catch (backendError) {
      console.error('Backend details fetch fallback failed:', backendError);
      throw error;
    }
  }
};

/**
 * Extract city name from address components
 * @param {object} place 
 * @returns {string}
 */
export const getCityFromPlace = (place) => {
  if (!place || !place.address_components) return '';
  const comp = place.address_components.find(c =>
    c.types.includes('locality') ||
    c.types.includes('sublocality') ||
    c.types.includes('administrative_area_level_2')
  );
  return comp ? comp.long_name : '';
};

/**
 * Extract state name from address components
 * @param {object} place 
 * @returns {string}
 */
export const getStateFromPlace = (place) => {
  if (!place || !place.address_components) return '';
  const comp = place.address_components.find(c => c.types.includes('administrative_area_level_1'));
  return comp ? comp.long_name : '';
};

/**
 * Extract country name from address components
 * @param {object} place 
 * @returns {string}
 */
export const getCountryFromPlace = (place) => {
  if (!place || !place.address_components) return '';
  const comp = place.address_components.find(c => c.types.includes('country'));
  return comp ? comp.long_name : '';
};

/**
 * Extract latitude and longitude from place geometry
 * @param {object} place 
 * @returns {object}
 */
export const getLatLngFromPlace = (place) => {
  if (!place || !place.geometry || !place.geometry.location) {
    return { latitude: null, longitude: null };
  }
  const loc = place.geometry.location;
  const latitude = typeof loc.lat === 'function' ? loc.lat() : loc.lat;
  const longitude = typeof loc.lng === 'function' ? loc.lng() : loc.lng;
  return { latitude, longitude };
};

export const getLocalityFromPlace = (place) => {
  if (!place || !place.address_components) return '';
  const comp = place.address_components.find(c =>
    c.types.includes('sublocality') ||
    c.types.includes('sublocality_level_1') ||
    c.types.includes('neighborhood')
  );
  return comp ? comp.long_name : '';
};

/**
 * Normalize Google Places API result into a standardized structure
 * @param {object} place 
 * @param {object} context 
 * @returns {object|null}
 */
export const normalizeGooglePlace = (place, context = null) => {
  if (!place) return null;
  const city = cleanLocationLabel(getCityFromPlace(place));
  const state = cleanLocationLabel(getStateFromPlace(place));
  const country = cleanLocationLabel(getCountryFromPlace(place));
  const { latitude, longitude } = getLatLngFromPlace(place);
  const label = cleanLocationLabel(place.formatted_address || place.name || '');
  const locality = cleanLocationLabel(getLocalityFromPlace(place));

  let distanceFromUserKm = null;
  if (context && context.latitude && context.longitude && latitude && longitude) {
    distanceFromUserKm = haversineDistanceKm(context.latitude, context.longitude, latitude, longitude);
  }

  return {
    label,
    value: label,
    placeId: place.place_id || place.id || '',
    city,
    locality,
    state,
    country,
    latitude,
    longitude,
    distanceFromUserKm,
    source: place.source || (distanceFromUserKm && distanceFromUserKm <= 50 ? "google_nearby" : "google_global"),
    raw: place,
  };
};

/**
 * Reverse geocode latitude and longitude to a place details object.
 * @param {number} lat 
 * @param {number} lng 
 * @returns {Promise<object>}
 */
export const reverseGeocode = async (lat, lng) => {
  try {
    const google = await loadGooglePlacesScript();
    if (!window.google || !window.google.maps || !window.google.maps.Geocoder) {
      throw new Error('Google Maps Geocoder is not loaded');
    }
    const geocoder = new window.google.maps.Geocoder();

    const geocodePromise = new Promise((resolve, reject) => {
      try {
        geocoder.geocode({ location: { lat: Number(lat), lng: Number(lng) } }, (results, status) => {
          if (status === 'OK') {
            if (results && results[0]) {
              resolve(results[0]);
            } else {
              reject(new Error('No geocoding results found'));
            }
          } else {
            reject(new Error(`Geocoder failed with status: ${status}`));
          }
        });
      } catch (err) {
        reject(err);
      }
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Google Geocoder timed out')), 2000);
    });

    return await Promise.race([geocodePromise, timeoutPromise]);
  } catch (error) {
    console.error('Google reverse geocode failed:', error);
    throw error;
  }
};

