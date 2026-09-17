import { useState, useEffect, useRef } from 'react';
import { HiLocationMarker, HiExclamationCircle, HiCheckCircle } from 'react-icons/hi';
import { Locate } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLocationContext } from '../../context/LocationContext';

// Standard fallback cities list if Google Places fails, is restricted, or returns zero results.
const STATIC_FALLBACK_CITIES = [
  { label: 'George Town, Grand Cayman, Cayman Islands', value: 'George Town, Grand Cayman, Cayman Islands', city: 'George Town', state: 'Grand Cayman', country: 'Cayman Islands', latitude: 19.2866, longitude: -81.3680 },
  { label: 'Bhubaneswar, Odisha, India', value: 'Bhubaneswar, Odisha, India', city: 'Bhubaneswar', state: 'Odisha', country: 'India', latitude: 20.2961, longitude: 85.8245 },
  { label: 'Miami, Florida, USA', value: 'Miami, Florida, USA', city: 'Miami', state: 'Florida', country: 'United States', latitude: 25.7617, longitude: -80.1918 },
  { label: 'New York, NY, USA', value: 'New York, NY, USA', city: 'New York', state: 'New York', country: 'United States', latitude: 40.7128, longitude: -74.0060 },
  { label: 'London, Greater London, United Kingdom', value: 'London, Greater London, United Kingdom', city: 'London', state: 'Greater London', country: 'United Kingdom', latitude: 51.5074, longitude: -0.1278 },
  { label: 'Toronto, Ontario, Canada', value: 'Toronto, Ontario, Canada', city: 'Toronto', state: 'Ontario', country: 'Canada', latitude: 43.6532, longitude: -79.3832 },
  { label: 'Sydney, New South Wales, Australia', value: 'Sydney, New South Wales, Australia', city: 'Sydney', state: 'New South Wales', country: 'Australia', latitude: -33.8688, longitude: 151.2093 }
];

const LocationAutocomplete = ({
  value,
  onChange,
  onSelect,
  mode = 'city', // 'city', 'address', 'serviceArea', 'jobLocation'
  placeholder = 'Search location...',
  label = '',
  error = '',
  required = false,
  disabled = false,
  allowRemote = false,
  className = '',
  inputClassName = '',
  iconClassName = '',
}) => {
  let locationContext = null;
  try {
    const context = useLocationContext();
    locationContext = context?.locationContext;
  } catch (_) { }

  const googlePlacesServiceRef = useRef(null);

  const getPlacesService = async () => {
    if (googlePlacesServiceRef.current) {
      return googlePlacesServiceRef.current;
    }
    const module = await import('../../services/googlePlacesService');
    googlePlacesServiceRef.current = module;
    return module;
  };

  // Extract display string for current input value
  const getDisplayValue = (val) => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    return val.label || val.value || '';
  };

  const [inputValue, setInputValue] = useState(getDisplayValue(value));
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [apiFailed, setApiFailed] = useState(false);
  const [fetchingGeo, setFetchingGeo] = useState(false);

  const handleFetchLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setFetchingGeo(true);
    setLoading(true);

    const handleSuccess = async (position) => {
      const { latitude, longitude } = position.coords;
      let normalized = null;

      // 1. Try to get details using Google reverse geocoding first
      try {
        const service = await getPlacesService();
        if (service && service.reverseGeocode) {
          const placeResult = await service.reverseGeocode(latitude, longitude);
          normalized = service.normalizeGooglePlace(placeResult, locationContext);
        }
      } catch (geocodeErr) {
        console.warn('Google reverse geocoding failed, trying OpenStreetMap Nominatim:', geocodeErr);
      }

      // 2. Fallback to OpenStreetMap Nominatim API directly from browser
      if (!normalized) {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=en`
          );
          if (response.ok) {
            const data = await response.json();
            if (data && data.display_name) {
              const addr = data.address || {};
              const city = addr.city || addr.town || addr.village || addr.suburb || addr.municipality || '';
              const state = addr.state || addr.province || '';
              const country = addr.country || '';

              normalized = {
                label: data.display_name,
                value: data.display_name,
                placeId: `nominatim-${data.place_id || Date.now()}`,
                city: city,
                locality: addr.suburb || addr.neighbourhood || city,
                state: state,
                country: country,
                latitude: Number(latitude),
                longitude: Number(longitude),
                isFallbackSelection: true
              };
            }
          }
        } catch (nominatimErr) {
          console.warn('Nominatim reverse geocoding failed, trying backend nearby API:', nominatimErr);
        }
      }

      // 3. Fallback to backend nearby API
      if (!normalized) {
        try {
          const { locationAPI } = await import('../../services/api');
          const response = await locationAPI.nearby(latitude, longitude);
          if (response?.data?.success && Array.isArray(response.data.data) && response.data.data.length > 0) {
            const nearest = response.data.data[0];
            normalized = {
              label: nearest.name,
              value: nearest.name,
              placeId: `nearby-${nearest.lat}-${nearest.lon}`,
              city: nearest.name,
              locality: nearest.name,
              state: '',
              country: '',
              latitude: nearest.lat,
              longitude: nearest.lon,
              isFallbackSelection: true
            };
          }
        } catch (backendErr) {
          console.warn('Backend nearby API failed:', backendErr);
        }
      }

      // Apply result or show error toast
      if (normalized) {
        setInputValue(normalized.label);
        if (onSelect) {
          onSelect(normalized);
        } else if (onChange) {
          onChange(normalized);
        }
        toast.success('Location updated successfully!');
      } else {
        toast.error('Could not determine address for your location. Try searching manually.');
      }

      setFetchingGeo(false);
      setLoading(false);
    };

    const handleError = (error) => {
      // Retry with low accuracy (IP/Wi-Fi positioning) before giving up
      navigator.geolocation.getCurrentPosition(
        handleSuccess,
        (finalErr) => {
          console.error('Geolocation error:', finalErr);
          let msg = 'Failed to fetch location';
          if (finalErr.code === finalErr.PERMISSION_DENIED) {
            if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
              msg = 'Location access blocked. Mobile browsers require HTTPS (or localhost) for location features.';
            } else {
              msg = 'Location permission denied. Please allow location access in your browser settings.';
            }
          } else if (finalErr.code === finalErr.POSITION_UNAVAILABLE) {
            msg = 'Location information is unavailable.';
          } else if (finalErr.code === finalErr.TIMEOUT) {
            msg = 'Location request timed out.';
          }
          toast.error(msg);
          setFetchingGeo(false);
          setLoading(false);
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
      );
    };

    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 4000,
      maximumAge: 60000,
    });
  };

  const containerRef = useRef(null);
  const debounceTimer = useRef(null);

  // Sync state if value prop changes from outside
  useEffect(() => {
    setInputValue(getDisplayValue(value));
  }, [value]);

  // Click outside close logic
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch predictions with debounce
  const fetchPredictions = (queryText) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    const trimmed = queryText.trim();
    if (trimmed.length < 2) {
      setPredictions([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);

    debounceTimer.current = setTimeout(async () => {
      try {
        const options = {
          ...(locationContext?.latitude && locationContext?.longitude ? {
            latitude: locationContext.latitude,
            longitude: locationContext.longitude,
            radiusMeters: locationContext.radiusMeters || 30000,
          } : {})
        };
        // Google Types mapping based on desired mode
        if (mode === 'city') {
          options.types = ['(regions)'];
        } else if (mode === 'serviceArea') {
          options.types = ['(regions)'];
        } else if (mode === 'jobLocation') {
          options.types = ['(regions)'];
        }

        const service = await getPlacesService();
        let results = await service.getPlacePredictions(trimmed, options) || [];

        if (allowRemote && 'remote'.startsWith(trimmed.toLowerCase())) {
          results.unshift({
            place_id: 'remote_option',
            description: 'Remote (Work from anywhere)',
            structured_formatting: {
              main_text: 'Remote',
              secondary_text: 'Work from anywhere'
            },
            isRemoteSelection: true,
            latitude: null,
            longitude: null,
            city: 'Remote',
            state: '',
            country: ''
          });
        }

        if (results && results.length > 0) {
          setPredictions(results);
          setApiFailed(false);
          setIsOpen(true);
        } else {
          // Google returned zero results — try backend, then static
          await tryBackendFallback(trimmed);
        }
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Google Places prediction API failed, trying backend: ', err.message);
        }
        // Google Maps JS API failed (key blocked, network issue, etc.)
        // Try backend locationAPI which uses server-side Google Places REST API
        await tryBackendFallback(trimmed);
      } finally {
        setLoading(false);
      }
    }, 400);
  };

  const tryBackendFallback = async (queryText) => {
    try {
      const { locationAPI } = await import('../../services/api');
      const response = await locationAPI.searchPlaces(queryText);
      const list = Array.isArray(response.data?.data) ? response.data.data : [];
      if (list.length > 0) {
        const predictions = list.map(p => ({
          place_id: p.placeId || `backend-${Date.now()}`,
          placeId: p.placeId,
          description: p.formattedAddress || p.name,
          label: p.formattedAddress || p.name,
          value: p.formattedAddress || p.name,
          structured_formatting: {
            main_text: p.name,
            secondary_text: p.formattedAddress,
          },
          city: p.city || p.name || '',
          locality: p.locality || p.name || '',
          state: p.state || '',
          country: p.country || '',
          latitude: p.latitude ?? null,
          longitude: p.longitude ?? null,
          source: 'backend',
        }));
        setPredictions(predictions);
        setApiFailed(false);
        setIsOpen(true);
        return;
      }
    } catch (backendErr) {
      console.warn('Backend location search also failed:', backendErr.message);
    }
    // Last resort: static city list
    setApiFailed(true);
    triggerStaticFallback(queryText);
  };

  const triggerStaticFallback = (queryText) => {
    const lowercaseQuery = queryText.toLowerCase();
    const filteredStatic = STATIC_FALLBACK_CITIES.filter(
      item => item.label.toLowerCase().includes(lowercaseQuery) ||
        item.city.toLowerCase().includes(lowercaseQuery) ||
        item.country.toLowerCase().includes(lowercaseQuery)
    );

    setPredictions(filteredStatic.map(item => ({
      place_id: `static-${item.city.toLowerCase()}`,
      description: item.label,
      structured_formatting: {
        main_text: item.city,
        secondary_text: `${item.state ? item.state + ', ' : ''}${item.country}`
      },
      isStaticFallback: true,
      staticData: item
    })));
    setIsOpen(true);
  };

  const handleInputChange = (e) => {
    const text = e.target.value;
    setInputValue(text);

    // Call onChange with plain typed text to update parent search input state,
    // but do NOT trigger detailed place selection/chips on plain keystrokes.
    if (onChange) {
      onChange(text);
    }

    fetchPredictions(text);
  };

  const handleSelectPrediction = async (prediction) => {
    setIsOpen(false);
    setLoading(true);

    try {
      if (prediction.isStaticFallback) {
        // Handle selection of a static fallback suggestion
        const normalized = {
          ...prediction.staticData,
          placeId: prediction.place_id,
          isFallbackSelection: true
        };
        setInputValue(normalized.label);
        if (onSelect) {
          onSelect(normalized);
        } else if (onChange) {
          onChange(normalized);
        }
      } else if (prediction.isRemoteSelection) {
        const normalized = {
          placeId: prediction.place_id,
          label: prediction.description,
          value: prediction.description,
          city: prediction.city,
          state: prediction.state,
          country: prediction.country,
          latitude: null,
          longitude: null,
          isRemote: true
        };
        setInputValue(normalized.label);
        if (onSelect) {
          onSelect(normalized);
        } else if (onChange) {
          onChange(normalized);
        }
      } else if (prediction.latitude != null && prediction.city) {
        // Prediction already has full location data (from backend fallback) - use it directly
        // without attempting a getPlaceDetails call (which would trigger blocked Google Maps JS API)
        const normalized = {
          label: prediction.description || prediction.label || prediction.value || '',
          value: prediction.description || prediction.label || prediction.value || '',
          placeId: prediction.place_id || prediction.placeId || '',
          city: prediction.city || prediction.structured_formatting?.main_text || '',
          locality: prediction.locality || '',
          state: prediction.state || '',
          country: prediction.country || '',
          latitude: prediction.latitude,
          longitude: prediction.longitude,
          isFallbackSelection: true,
        };
        setInputValue(normalized.label);
        if (onSelect) {
          onSelect(normalized);
        } else if (onChange) {
          onChange(normalized);
        }
      } else {
        // Handle actual Google place selection (attempt getPlaceDetails with fallback chain)
        const service = await getPlacesService();
        try {
          const placeDetails = await service.getPlaceDetails(prediction.place_id);
          const normalized = service.normalizeGooglePlace(placeDetails, locationContext);

          if (normalized) {
            setInputValue(normalized.label);
            if (onSelect) {
              onSelect(normalized);
            } else if (onChange) {
              onChange(normalized);
            }
          } else {
            throw new Error('Normalization returned null');
          }
        } catch (detailsErr) {
          // getPlaceDetails failed (Google Maps JS API blocked or network error)
          // Fall through to use prediction inline data as best-effort
          throw detailsErr;
        }
      }
    } catch (err) {
      console.warn('Failed to select prediction details, using inline data: ', err.message);
      // Best-effort fallback: use whatever data is already on the prediction object
      const label = prediction.description || prediction.label || prediction.value || '';
      const fallbackVal = {
        label,
        value: label,
        placeId: prediction.place_id || prediction.placeId || '',
        city: prediction.city || prediction.structured_formatting?.main_text || '',
        locality: prediction.locality || '',
        state: prediction.state || '',
        country: prediction.country || '',
        latitude: prediction.latitude ?? null,
        longitude: prediction.longitude ?? null,
        isFallbackSelection: true
      };
      setInputValue(fallbackVal.label);
      if (onSelect) {
        onSelect(fallbackVal);
      } else if (onChange) {
        onChange(fallbackVal);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative flex flex-col w-full ${className}`}>
      {label && (
        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
          {label} {required && <span className="text-red-700">*</span>}
        </label>
      )}

      <div className="relative">
        <HiLocationMarker className={`absolute left-3 top-1/2 -translate-y-1/2 z-10 ${iconClassName || 'w-4 h-4 text-gray-400'}`} />

        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              // Just close the dropdown and let the natural form submission happen
              // so the user searches for EXACTLY what they typed.
              setIsOpen(false);
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          onFocus={() => {
            getPlacesService();
            if (predictions.length > 0) setIsOpen(true);
          }}
          className={`w-full border rounded-xl pl-9 pr-16 py-2 text-sm transition-all duration-200 outline-none
            ${error
              ? 'border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:bg-red-50/20'
              : 'border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:bg-blue-50/10'
            }
            ${disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200' : 'bg-white text-gray-700'}
            ${inputClassName}
          `}
          autoComplete="off"
        />

        {loading && (
          <div className="absolute right-10 top-1/2 -translate-y-1/2 flex items-center justify-center">
            <svg className="animate-spin h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        )}

        <button
          type="button"
          onClick={handleFetchLocation}
          title="Fetch current location"
          disabled={disabled || fetchingGeo}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed z-20 cursor-pointer"
        >
          <Locate className={`w-4 h-4 ${fetchingGeo ? 'animate-pulse text-blue-600' : ''}`} />
        </button>
      </div>

      {error && (
        <span className="text-xs text-red-700 mt-1 flex items-center gap-1 font-medium">
          <HiExclamationCircle className="w-3.5 h-3.5" />
          {error}
        </span>
      )}

      {isOpen && (predictions.length > 0 || apiFailed) && (
        <div className="absolute left-0 top-10 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto py-1.5 animate-fadeIn min-w-full md:min-w-[320px] w-max max-w-[90vw]">
          {apiFailed && (
            <div className="px-3 py-1 bg-amber-50 text-[11px] text-amber-700 font-medium flex items-center gap-1 border-b border-amber-100/50 mb-1">
              <HiExclamationCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
              Suggestions loading offline mode. You can still type manually.
            </div>
          )}

          {(() => {
            const nearbySuggestions = predictions.filter(p => p.source === 'google_nearby');
            const otherSuggestions = predictions.filter(p => p.source !== 'google_nearby');

            const renderPredictionButton = (prediction) => (
              <button
                key={prediction.place_id}
                type="button"
                onClick={() => handleSelectPrediction(prediction)}
                className="w-full text-left px-4 py-2 hover:bg-blue-50/50 transition-colors duration-150 border-b border-gray-50/60 last:border-b-0 flex items-start gap-2.5"
              >
                <HiLocationMarker className={`w-4 h-4 mt-0.5 flex-shrink-0 ${prediction.isStaticFallback ? 'text-stone-400' : 'text-blue-500'}`} />
                <div className="flex flex-col min-w-0 font-sans">
                  <span className="text-sm font-semibold text-gray-700 truncate">
                    {prediction.structured_formatting?.main_text || prediction.description}
                  </span>
                  {prediction.structured_formatting?.secondary_text && (
                    <span className="text-xs text-gray-400 truncate flex items-center gap-1.5">
                      {prediction.structured_formatting.secondary_text}
                      {prediction.distanceFromUserKm && (
                        <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-bold">
                          {prediction.distanceFromUserKm} km away
                        </span>
                      )}
                    </span>
                  )}
                </div>
              </button>
            );

            return (
              <>
                {nearbySuggestions.length > 0 && (
                  <div>
                    <div className="px-4 py-1 text-[10px] font-bold text-blue-600 uppercase tracking-wider bg-blue-50/30">
                      Nearby suggestions
                    </div>
                    {nearbySuggestions.map(p => renderPredictionButton(p))}
                  </div>
                )}

                {otherSuggestions.length > 0 && (
                  <div>
                    {nearbySuggestions.length > 0 && (
                      <div className="px-4 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50 mt-1 border-t border-gray-50">
                        Other suggestions
                      </div>
                    )}
                    {otherSuggestions.map(p => renderPredictionButton(p))}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default LocationAutocomplete;
