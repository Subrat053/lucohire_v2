import { localeAPI } from '../services/api';

const getBrowserCoordinates = () => new Promise((resolve, reject) => {
  if (!navigator?.geolocation) {
    reject(new Error('Geolocation is not supported in this browser.'));
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    },
    () => {
      // High accuracy failed or timed out; retry with low accuracy (IP/Wi-Fi positioning)
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        (err) => reject(err),
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
      );
    },
    {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 60000,
    }
  );
});

export const detectNearestLocation = async () => {
  try {
    const coords = await getBrowserCoordinates();
    const { data } = await localeAPI.reverseGeocode(coords.latitude, coords.longitude);

    return {
      city: data?.city || '',
      state: data?.state || '',
      country: data?.country || 'IN',
      nearestLocation: data?.nearestLocation || data?.city || '',
      latitude: data?.latitude ?? coords.latitude,
      longitude: data?.longitude ?? coords.longitude,
      source: data?.source || 'browser',
    };
  } catch (err) {
    // If browser location fails, return safe fallback without throwing
    return {
      city: 'India',
      state: '',
      country: 'IN',
      nearestLocation: 'India',
      source: 'fallback',
    };
  }
};
