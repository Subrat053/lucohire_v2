
/**
 * Request approximate browser location.
 * @returns {Promise<{latitude: number, longitude: number}>}
 */
export const getBrowserCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        reject(error);
      },
      { timeout: 8000, enableHighAccuracy: false }
    );
  });
};

/**
 * Reverse-geocode latitude and longitude into structured address properties using Google Maps Geocoder.
 * @param {number} lat 
 * @param {number} lng 
 * @returns {Promise<object|null>}
 */
export const getApproxLocationFromGoogle = async (lat, lng) => {
  try {
    const { loadGooglePlacesScript } = await import('./googlePlacesService');
    await loadGooglePlacesScript();
    if (typeof window === 'undefined' || !window.google || !window.google.maps) {
      throw new Error("Google Maps API is not loaded");
    }

    const geocoder = new window.google.maps.Geocoder();
    return new Promise((resolve) => {
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const place = results[0];
          
          const getComponent = (types) => {
            const comp = place.address_components.find(c => 
              types.some(t => c.types.includes(t))
            );
            return comp ? comp.long_name : '';
          };

          const city = getComponent(['locality', 'administrative_area_level_2']);
          const state = getComponent(['administrative_area_level_1']);
          const country = getComponent(['country']);
          const locality = getComponent(['sublocality_level_1', 'sublocality', 'neighborhood']);
          const label = place.formatted_address || '';

          resolve({
            label,
            city: city || 'Bhubaneswar', // Ensure standard fallback if city parsing is empty
            locality,
            state,
            country,
            latitude: lat,
            longitude: lng,
          });
        } else {
          resolve(null);
        }
      });
    });
  } catch (err) {
    console.warn("Google reverse geocoding failed, falling back:", err.message);
    return null;
  }
};

/**
 * Read the saved profile locationData.
 * @param {object} user 
 * @param {object} profile 
 * @returns {object|null}
 */
export const getSavedUserLocation = (user, profile) => {
  const profileLoc = profile?.locationData || profile?.locationGeo || profile?.location;
  const userLoc = user?.locationData || user?.locationGeo || user?.location;

  const target = profileLoc || userLoc;
  if (!target) return null;

  // 1. If locationData is a structured object
  if (typeof target === 'object' && target.latitude && target.longitude) {
    return {
      source: "profile",
      label: target.label || target.value || '',
      city: target.city || '',
      locality: target.locality || '',
      state: target.state || '',
      country: target.country || '',
      latitude: Number(target.latitude),
      longitude: Number(target.longitude),
      radiusMeters: 30000,
    };
  }

  // 2. If it's locationGeo structure
  if (typeof target === 'object' && target.coordinates && Array.isArray(target.coordinates)) {
    return {
      source: "profile",
      label: target.label || '',
      city: target.city || '',
      locality: target.locality || '',
      state: target.state || '',
      country: target.country || '',
      latitude: target.coordinates[1],
      longitude: target.coordinates[0],
      radiusMeters: 30000,
    };
  }

  // 3. Fallback to basic location subdocument
  if (typeof target === 'object') {
    const lat = target.latitude || target.lat;
    const lng = target.longitude || target.lng || target.lon;
    if (lat && lng) {
      return {
        source: "profile",
        label: target.label || target.formattedAddress || target.city || '',
        city: target.city || '',
        locality: target.locality || '',
        state: target.state || '',
        country: target.country || '',
        latitude: Number(lat),
        longitude: Number(lng),
        radiusMeters: 30000,
      };
    }
  }

  // 4. String fallback
  if (typeof target === 'string' && target.trim()) {
    return {
      source: "profile",
      label: target,
      city: target,
      locality: "",
      state: "",
      country: "India",
      latitude: null,
      longitude: null,
      radiusMeters: 30000,
    };
  }

  return null;
};

/**
 * Returns the effective user location context by evaluating priorities: Geolocation -> Profile -> Cached -> Fallback.
 * @param {object} user 
 * @param {object} profile 
 * @returns {Promise<object>}
 */
export const getEffectiveUserLocation = async (user, profile) => {
  // Priority 1: Check cached first to avoid repeated permissions prompt
  const cached = localStorage.getItem("servicehub_user_location_context");
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.latitude && parsed.longitude) {
        return {
          ...parsed,
          source: parsed.source || "localStorage",
        };
      }
    } catch (_) {}
  }

  // Priority 2: Check profile locationData or geo
  const saved = getSavedUserLocation(user, profile);
  if (saved && saved.latitude && saved.longitude) {
    saveUserLocationContext(saved);
    return saved;
  }

  // Priority 3: Geolocation (Ask browser approximate location context if permission status is favorable and user is logged in)
  if (user) {
    try {
      const coords = await getBrowserCurrentLocation();
      if (coords && coords.latitude) {
        const googleLoc = await getApproxLocationFromGoogle(coords.latitude, coords.longitude);
        if (googleLoc) {
          const fullLoc = {
            source: "browser",
            radiusMeters: 30000,
            ...googleLoc,
          };
          saveUserLocationContext(fullLoc);
          return fullLoc;
        }
      }
    } catch (err) {
      // Geolocation rejected or failed
    }
  }

  // Priority 4: Standard default fallback (e.g. Bhubaneswar, India)
  const defaultFallback = {
    source: "fallback",
    label: "Patia, Bhubaneswar, Odisha, India",
    city: "Bhubaneswar",
    locality: "Patia",
    state: "Odisha",
    country: "India",
    latitude: 20.2961,
    longitude: 85.8245,
    radiusMeters: 30000,
  };
  saveUserLocationContext(defaultFallback);
  return defaultFallback;
};

/**
 * Cache current location context inside local storage
 * @param {object} locationData 
 */
export const saveUserLocationContext = (locationData) => {
  if (!locationData) return;
  localStorage.setItem("servicehub_user_location_context", JSON.stringify(locationData));
};

/**
 * Clear cached location context
 */
export const clearUserLocationContext = () => {
  localStorage.removeItem("servicehub_user_location_context");
};

/**
 * Extract Google Bias parameters
 * @param {object} context 
 * @returns {object}
 */
export const getLocationBiasParams = (context) => {
  if (!context || !context.latitude || !context.longitude) return {};
  return {
    latitude: context.latitude,
    longitude: context.longitude,
    radiusMeters: context.radiusMeters || 30000,
    country: context.country || 'India',
  };
};
