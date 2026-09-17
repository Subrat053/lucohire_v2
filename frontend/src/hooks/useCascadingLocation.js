import { useState, useEffect, useCallback } from 'react';

/**
 * useCascadingLocation — Manages Country → State → City cascade selection.
 *
 * Uses the free countriesnow.space API. Falls back gracefully if API is unavailable.
 *
 * Features:
 *   - Resets state list when country changes
 *   - Resets city list when state changes
 *   - Preserves existing text-based values when editing old records (backward compat)
 *   - Provides loading flags for each level
 *
 * Usage:
 *   const {
 *     countries, states, cities,
 *     selectedCountry, selectedState, selectedCity,
 *     setSelectedCountry, setSelectedState, setSelectedCity,
 *     loadingStates, loadingCities,
 *   } = useCascadingLocation({ initialCountry: 'India', initialState: 'Maharashtra', initialCity: 'Mumbai' });
 */

const API_BASE = 'https://countriesnow.space/api/v0.1';

// Simple in-memory cache to avoid refetching
const _cache = {};

const cachedFetch = async (url) => {
  if (_cache[url]) return _cache[url];
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  _cache[url] = json;
  return json;
};

const useCascadingLocation = ({
  initialCountry = '',
  initialState = '',
  initialCity = '',
} = {}) => {
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);

  const [selectedCountry, setSelectedCountryState] = useState(initialCountry);
  const [selectedState, setSelectedStateState] = useState(initialState);
  const [selectedCity, setSelectedCityState] = useState(initialCity);

  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  const [errorCountries, setErrorCountries] = useState('');
  const [errorStates, setErrorStates] = useState('');
  const [errorCities, setErrorCities] = useState('');

  // ── Load all countries on mount ───────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingCountries(true);
      setErrorCountries('');
      try {
        const json = await cachedFetch(`${API_BASE}/countries`);
        if (cancelled) return;
        const list = Array.isArray(json?.data) ? json.data.map((c) => c.country || c.name || c) : [];
        setCountries(list.sort());
      } catch {
        if (!cancelled) setErrorCountries('Could not load countries. Please type manually.');
      } finally {
        if (!cancelled) setLoadingCountries(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // ── Load states when country changes ─────────────────────────────────────
  const fetchStates = useCallback(async (country) => {
    if (!country) { setStates([]); return; }
    setLoadingStates(true);
    setErrorStates('');
    setStates([]);
    try {
      const json = await cachedFetch(`${API_BASE}/countries/states`);
      const countryData = Array.isArray(json?.data)
        ? json.data.find((c) => (c.name || c.country || '').toLowerCase() === country.toLowerCase())
        : null;
      const list = countryData?.states?.map((s) => s.name || s) || [];
      setStates(list.sort());
      if (list.length === 0) setErrorStates('No states found for this country.');
    } catch {
      setErrorStates('Could not load states.');
    } finally {
      setLoadingStates(false);
    }
  }, []);

  // ── Load cities when state changes ────────────────────────────────────────
  const fetchCities = useCallback(async (country, state) => {
    if (!country || !state) { setCities([]); return; }
    setLoadingCities(true);
    setErrorCities('');
    setCities([]);
    try {
      const res = await fetch(`${API_BASE}/countries/state/cities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country, state }),
        signal: AbortSignal.timeout(8000),
      });
      const json = await res.json();
      const list = Array.isArray(json?.data) ? json.data : [];
      setCities(list.sort());
      if (list.length === 0) setErrorCities('No cities found for this state.');
    } catch {
      setErrorCities('Could not load cities.');
    } finally {
      setLoadingCities(false);
    }
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const setSelectedCountry = useCallback((country) => {
    setSelectedCountryState(country);
    setSelectedStateState('');
    setSelectedCityState('');
    setStates([]);
    setCities([]);
    setErrorStates('');
    setErrorCities('');
    if (country) fetchStates(country);
  }, [fetchStates]);

  const setSelectedState = useCallback((state) => {
    setSelectedStateState(state);
    setSelectedCityState('');
    setCities([]);
    setErrorCities('');
    if (state && selectedCountry) fetchCities(selectedCountry, state);
  }, [selectedCountry, fetchCities]);

  const setSelectedCity = useCallback((city) => {
    setSelectedCityState(city);
  }, []);

  // ── Init: if initial values provided, load dependent lists ────────────────
  useEffect(() => {
    if (initialCountry) {
      fetchStates(initialCountry);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only on mount

  useEffect(() => {
    if (initialCountry && initialState) {
      fetchCities(initialCountry, initialState);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only on mount

  return {
    // Data
    countries,
    states,
    cities,
    // Selected values
    selectedCountry,
    selectedState,
    selectedCity,
    // Setters (trigger cascade)
    setSelectedCountry,
    setSelectedState,
    setSelectedCity,
    // Loading flags
    loadingCountries,
    loadingStates,
    loadingCities,
    // Error messages
    errorCountries,
    errorStates,
    errorCities,
  };
};

export default useCascadingLocation;
